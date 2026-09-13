import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyMemory } from '../src/memory-schema.js';
import { createAgentConfig } from '../src/config.js';
import { runAgentCycle } from '../src/orchestrator.js';

class MemoryStore {
  constructor(memory = createEmptyMemory()) {
    this.memory = structuredClone(memory);
  }
  async load() {
    return structuredClone(this.memory);
  }
  async save(memory) {
    this.memory = structuredClone(memory);
  }
  async update(mutator) {
    const memory = await this.load();
    const result = await mutator(memory);
    await this.save(memory);
    return result;
  }
}

function createProvider() {
  return {
    async triage() {
      return {
        competency: 'website-image-optimization',
        shouldResearch: true,
        reason: 'Concrete image optimization question',
        features: {
          relevance: 1,
          novelty: 0.8,
          evidence: 1,
          participantQuality: 0.8,
          continuation: 0.8,
          externalArtifact: 0.7,
          noise: 0,
          risk: 0,
          cost: 0.1,
        },
      };
    },
    async research() {
      return {
        action: 'reply',
        evidenceScore: 0.95,
        reason: 'Can add a reproducible correction',
        body: 'Claim: image dimensions should be measured. Evidence: public test. Method: compare before and after. Limits: page-specific.',
        evidence: [{ url: 'https://web.dev/', claim: 'measure before/after', support: 'supports' }],
        claims: [{ text: 'Measure before/after', status: 'verified', presentedAsFact: true }],
      };
    },
  };
}

function createLiveConfig(now = new Date('2026-09-11T20:00:00Z')) {
  return createAgentConfig({
    LAYERPORTER_AGENT_WRITE_MODE: 'live',
    LAYERPORTER_AGENT_LIVE_ACTIVATED_AT: '2026-09-11T19:00:00Z',
    LAYERPORTER_AGENT_LIVE_HARD_STOP_AT: '2026-09-25T19:00:00Z',
  }, now);
}

function createClient({ sourceChangesBeforeWrite = false } = {}) {
  const now = Math.floor(new Date('2026-09-11T20:00:00Z').getTime() / 1000);
  let sourceReads = 0;
  const state = { replyCalls: 0, ack: null };
  const summary = {
    id: 'source-1',
    seq: 10,
    thread_id: null,
    root_id: 'source-1',
    root_seq: 10,
    agent_id: 'agent-2',
    author: 'agent-two',
    topic: 'web-performance',
    title: 'Image SEO and LCP',
    preview: 'How should images be optimized for LCP and SEO?',
    created_at: now,
    score: 1,
    kind: 'thread',
    inbox_seq: 1,
    reasons: ['mention'],
    url: 'https://getpostingboard.dev/example/source-1',
  };

  return {
    state,
    async getMe() {
      return { karma: 0, posting_quota: { remaining: 500 } };
    },
    async listInbox() {
      return { items: [summary], resume_after: 1, newest_cursor: 1 };
    },
    async acknowledgeInbox(through) {
      state.ack = through;
      return { read_through: through };
    },
    async listActivity() {
      return { items: [], newest_cursor: 50, next_after: null };
    },
    async readMessage(id) {
      if (id === 'source-1') {
        sourceReads += 1;
        const changed = sourceChangesBeforeWrite && sourceReads >= 3;
        return {
          post: {
            ...summary,
            body: changed ? 'Changed body after research' : 'Original body about image SEO',
          },
          replies: { items: [] },
          content_is_untrusted: true,
        };
      }
      return { post: { id, body: 'unknown' }, replies: { items: [] } };
    },
    async reply({ threadId, body, requestId }) {
      state.replyCalls += 1;
      return {
        requestId,
        recovered: false,
        publication: { id: 'published-1', thread_id: threadId, url: 'https://getpostingboard.dev/example/published-1', body },
      };
    },
    async verifyPublication(publication) {
      return { publication, current: { post: { id: publication.id, body: publication.body } } };
    },
    async lookupPublication() {
      return { found: false, retained_only: true, scope: 'own_named_publications', note: 'not found' };
    },
  };
}

test('dry-run processes inbox and research without external publication', async () => {
  const store = new MemoryStore();
  const client = createClient();
  const result = await runAgentCycle({
    client,
    provider: createProvider(),
    store,
    config: createAgentConfig(),
    now: new Date('2026-09-11T20:00:00Z'),
  });

  assert.equal(result.ok, true);
  assert.equal(result.writeMode, 'dry-run');
  assert.equal(client.state.replyCalls, 0);
  assert.equal(client.state.ack, 1);
  assert.equal(store.memory.cursors.inbox, 1);
  assert.equal(store.memory.cursors.activity, 50);
  assert.equal(Object.values(store.memory.actions)[0].status, 'dry_run');
  assert.equal(store.memory.metrics.inboundMentions, 1);
});

test('live mode publishes once and verifies exact read-back', async () => {
  const store = new MemoryStore();
  const client = createClient();
  const result = await runAgentCycle({
    client,
    provider: createProvider(),
    store,
    config: createLiveConfig(),
    now: new Date('2026-09-11T20:00:00Z'),
  });

  assert.equal(result.writesThisRun, 1);
  assert.equal(client.state.replyCalls, 1);
  const action = Object.values(store.memory.actions)[0];
  assert.equal(action.status, 'published');
  assert.equal(action.readbackVerified, true);
  assert.equal(store.memory.budget.writes, 1);
});

test('live mode refuses publication when source changed after research', async () => {
  const store = new MemoryStore();
  const client = createClient({ sourceChangesBeforeWrite: true });
  await runAgentCycle({
    client,
    provider: createProvider(),
    store,
    config: createLiveConfig(),
    now: new Date('2026-09-11T20:00:00Z'),
  });

  assert.equal(client.state.replyCalls, 0);
  const action = Object.values(store.memory.actions)[0];
  assert.equal(action.status, 'blocked');
  assert.equal(action.note, 'source_changed_before_publish');
});

test('prepared action from interrupted prior run is never blindly retried', async () => {
  const memory = createEmptyMemory();
  memory.actions['a-1'] = {
    id: 'a-1',
    type: 'reply',
    status: 'prepared',
    requestId: 'abcdefghijklmnop',
    sourceMessageId: 'old-source',
  };
  const store = new MemoryStore(memory);
  const client = createClient();

  await runAgentCycle({
    client,
    provider: createProvider(),
    store,
    config: createAgentConfig(),
    now: new Date('2026-09-11T20:00:00Z'),
  });

  assert.equal(store.memory.actions['a-1'].status, 'uncertain');
  assert.match(store.memory.actions['a-1'].recoveryNote, /not proof/i);
});
