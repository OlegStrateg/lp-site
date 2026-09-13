import { randomUUID, createHash } from 'node:crypto';
import { LAYERPORTER_AGENT_IDENTITY } from './identity.js';
import {
  hasTerminalActionForSource,
  recordAction,
  resetDailyBudget,
  setCursor,
  upsertEntity,
} from './memory-schema.js';
import { collectDiscovery } from './discovery.js';
import { triageMessages, researchOpportunity, verifySourceUnchanged } from './research-pipeline.js';
import { assertActionAllowed } from './action-policy.js';
import { appendRunLog, makeRunRecord } from './observability.js';
import { recordReputationEvent } from './reputation-ledger.js';
import { preparePilotMeasurement, recordPilotRun } from './pilot-measurement.js';
import { evaluateLiveSafety } from './live-safety-gate.js';

const PUBLIC_PRODUCT_CONTEXT = Object.freeze({
  website: 'https://layerporter.com/',
  websiteImageOptimizerMcp: 'https://layerporter.com/mcp/website-image-optimizer/',
  websiteImageOptimizerDocs: 'https://layerporter.com/docs/mcp/website-image-optimizer/',
  pictureConverter: 'https://layerporter.com/picture-converter/',
  pinterestDownloader: 'https://layerporter.com/pinterest-downloader/',
});

function sha256(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function trim(value, limit) {
  const text = String(value || '');
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

function providerUsage(provider) {
  if (typeof provider?.getUsage !== 'function') {
    return { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }
  return provider.getUsage();
}

function relationshipContext(memory, message) {
  const agentId = message.agent_id || message.author || 'unknown';
  return {
    agent: memory.agents[agentId] || null,
    relationship: memory.relationships[agentId] || null,
    thread: memory.threads[message.root_id || message.thread_id || message.id] || null,
  };
}

function threadContextFromRead(read) {
  return {
    root: read?.post ? {
      id: read.post.id,
      author: read.post.author,
      title: read.post.title,
      topic: read.post.topic,
      body: trim(read.post.body, 6000),
    } : null,
    replies: (read?.replies?.items || []).slice(0, 12).map((reply) => ({
      id: reply.id,
      author: reply.author,
      preview: reply.preview,
      created_at: reply.created_at,
    })),
  };
}

function touchAgent(memory, message, nowIso) {
  const agentId = message.agent_id || message.author;
  if (!agentId) return;
  const previous = memory.relationships[agentId] || {};
  upsertEntity(memory, 'agents', agentId, {
    name: message.author || previous.name || agentId,
    lastSeenAt: nowIso,
  }, nowIso);

  const seenMessageIds = Array.isArray(previous.seenMessageIds) ? previous.seenMessageIds : [];
  if (seenMessageIds.includes(message.id)) {
    upsertEntity(memory, 'relationships', agentId, {
      ...previous,
      name: message.author || agentId,
      lastInteractionAt: nowIso,
    }, nowIso);
    return;
  }

  const interactionCount = Number(previous.interactionCount || 0) + 1;
  upsertEntity(memory, 'relationships', agentId, {
    ...previous,
    name: message.author || agentId,
    interactionCount,
    seenMessageIds: [...seenMessageIds, message.id].slice(-50),
    lastInteractionAt: nowIso,
  }, nowIso);
  if (interactionCount === 2) {
    recordReputationEvent(memory, {
      id: `returning_agent:${agentId}`,
      type: 'returning_agent',
      sourceId: message.id,
      agentId,
      at: nowIso,
    });
  }
}

function recordInboxSignals(memory, messages, nowIso) {
  for (const message of messages.filter((item) => item.source === 'inbox')) {
    touchAgent(memory, message, nowIso);
    upsertEntity(memory, 'mentions', message.id, {
      agentId: message.agent_id || null,
      author: message.author,
      reasons: message.inbox_reasons || [],
      sourceUrl: message.url || null,
      observedAt: nowIso,
    }, nowIso);
    if ((message.inbox_reasons || []).includes('mention')) {
      recordReputationEvent(memory, {
        id: `inbound_mention:${message.id}`,
        type: 'inbound_mention',
        sourceId: message.id,
        sourceUrl: message.url || null,
        agentId: message.agent_id || null,
        at: nowIso,
      });
    }
  }
}

async function recoverPreparedActions({ client, memory, store, nowIso }) {
  for (const action of Object.values(memory.actions || {})) {
    if (action.status !== 'prepared' || !action.requestId) continue;
    try {
      const receipt = await client.lookupPublication(action.requestId);
      if (receipt?.found) {
        action.status = 'published';
        action.recovered = true;
        action.publicationId = receipt.publication?.id || null;
        action.publicationUrl = receipt.publication?.url || null;
      } else {
        action.status = 'uncertain';
        action.recoveryNote = 'Retained lookup returned found=false; not proof the write never committed.';
      }
    } catch (error) {
      action.status = 'uncertain';
      action.recoveryNote = `Receipt lookup failed: ${error.code || error.name}`;
    }
    action.updatedAt = nowIso;
    await store.save(memory);
  }
}

function canWrite({ memory, config, account, now }) {
  const safety = evaluateLiveSafety(memory, config, now);
  if (!safety.allowed) return safety;
  if (memory.budget.writes >= config.maxDailyWrites) return { allowed: false, reason: 'daily_internal_budget' };
  if (Number(account?.posting_quota?.remaining ?? 1) <= 0) return { allowed: false, reason: 'postingboard_quota' };
  return { allowed: true, reason: null };
}

async function persistNonWriteAction({ memory, store, proposal, candidate, status, note }) {
  const id = randomUUID();
  recordAction(memory, {
    id,
    type: proposal.action,
    status,
    sourceMessageId: candidate.message.id,
    sourceUrl: candidate.message.url || null,
    opportunityScore: proposal.opportunityScore,
    evidenceScore: proposal.evidenceScore,
    bodyHash: proposal.body ? sha256(proposal.body) : null,
    bodyBytes: proposal.body ? Buffer.byteLength(proposal.body, 'utf8') : 0,
    note,
  });
  await store.save(memory);
  return memory.actions[id];
}

async function executeReply({ client, memory, store, proposal, candidate, config, now }) {
  const writeGate = canWrite({ memory, config, account: memory.lastAccountSnapshot, now });
  if (!writeGate.allowed) {
    return persistNonWriteAction({
      memory,
      store,
      proposal,
      candidate,
      status: writeGate.reason === 'dry_run' ? 'dry_run' : 'blocked',
      note: writeGate.reason,
    });
  }

  assertActionAllowed(proposal, {
    minimumOpportunityScore: config.minimumLiveOpportunityScore,
    minimumEvidenceScore: config.minimumLiveEvidenceScore,
  });
  const fresh = await client.readMessage(candidate.message.id, { limit: 30 });
  const sourceCheck = verifySourceUnchanged({
    originalHash: proposal.sourceContentHash,
    currentBody: fresh?.post?.body || '',
  });
  if (!sourceCheck.unchanged) {
    return persistNonWriteAction({
      memory,
      store,
      proposal,
      candidate,
      status: 'blocked',
      note: 'source_changed_before_publish',
    });
  }

  const actionId = randomUUID();
  const requestId = randomUUID();
  const threadId = candidate.message.root_id || candidate.message.thread_id || candidate.message.id;
  const replyToId = candidate.message.kind === 'reply' ? candidate.message.id : null;
  recordAction(memory, {
    id: actionId,
    type: 'reply',
    status: 'prepared',
    sourceMessageId: candidate.message.id,
    sourceUrl: candidate.message.url || null,
    threadId,
    replyToId,
    requestId,
    opportunityScore: proposal.opportunityScore,
    evidenceScore: proposal.evidenceScore,
    bodyHash: sha256(proposal.body),
    bodyBytes: Buffer.byteLength(proposal.body, 'utf8'),
  });
  memory.budget.writes += 1;
  await store.save(memory);

  try {
    const result = await client.reply({
      threadId,
      replyToId,
      body: proposal.body,
      requestId,
    });
    const readback = await client.verifyPublication(result.publication);
    const exactBody = readback?.current?.post?.body || '';
    const verified = exactBody === proposal.body;
    Object.assign(memory.actions[actionId], {
      status: verified ? 'published' : 'published_unverified',
      recovered: Boolean(result.recovered),
      publicationId: result.publication?.id || null,
      publicationUrl: result.publication?.url || null,
      readbackVerified: verified,
    });
  } catch (error) {
    Object.assign(memory.actions[actionId], {
      status: error.code === 'WRITE_UNCERTAIN' ? 'uncertain' : 'failed',
      errorCode: error.code || error.name,
    });
  }

  await store.save(memory);
  return memory.actions[actionId];
}

export async function runAgentCycle({ client, provider, store, config, now = new Date() }) {
  const runId = randomUUID();
  const startedAt = now.toISOString();
  const memory = await store.load();
  resetDailyBudget(memory, now);
  preparePilotMeasurement(memory, { now, writeMode: config.writeMode });
  await recoverPreparedActions({ client, memory, store, nowIso: startedAt });

  const runCounters = {
    inboxSeen: 0,
    activitySeen: 0,
    hydrated: 0,
    candidates: 0,
    researched: 0,
    writesThisRun: 0,
  };

  try {
    const account = await client.getMe();
    memory.lastAccountSnapshot = {
      karma: account?.karma ?? null,
      posting_quota: account?.posting_quota ?? null,
      sampledAt: startedAt,
    };

    const discovery = await collectDiscovery({
      client,
      memory,
      config,
      agentName: LAYERPORTER_AGENT_IDENTITY.name,
      now,
    });
    Object.assign(runCounters, discovery.counts);
    recordInboxSignals(memory, discovery.messages, startedAt);
    await store.save(memory);

    const candidates = await triageMessages({
      provider,
      messages: discovery.messages,
      memoryContext: { metrics: memory.metrics },
    });
    runCounters.candidates = candidates.length;
    memory.budget.triageCalls += discovery.messages.length;

    let researched = 0;
    let writesThisRun = 0;
    for (const candidate of candidates.slice(0, config.maxResearchPerRun)) {
      if (hasTerminalActionForSource(memory, candidate.message.id)) continue;
      if (writesThisRun >= config.maxWritesPerRun && config.writeMode === 'live') break;

      if (candidate.message.source === 'inbox') {
        recordReputationEvent(memory, {
          id: `meaningful_reply:${candidate.message.id}`,
          type: 'meaningful_reply',
          sourceId: candidate.message.id,
          sourceUrl: candidate.message.url || null,
          agentId: candidate.message.agent_id || null,
          at: startedAt,
        });
      }

      const rootId = candidate.message.root_id || candidate.message.thread_id || candidate.message.id;
      const threadRead = await client.readMessage(rootId, { limit: 30 });
      const result = await researchOpportunity({
        provider,
        candidate,
        threadContext: threadContextFromRead(threadRead),
        memoryContext: relationshipContext(memory, candidate.message),
        publicProductContext: PUBLIC_PRODUCT_CONTEXT,
      });
      researched += 1;
      runCounters.researched = researched;
      memory.budget.researchCalls += 1;

      const proposal = result.proposal;
      if (!result.policy.allowed) {
        await persistNonWriteAction({
          memory,
          store,
          proposal,
          candidate,
          status: 'blocked',
          note: `policy:${result.policy.reasons.join(',')}`,
        });
        continue;
      }

      if (['save_only', 'defer', 'do_nothing'].includes(proposal.action)) {
        await persistNonWriteAction({ memory, store, proposal, candidate, status: proposal.action, note: proposal.reason });
        continue;
      }

      if (proposal.action === 'create_thread' && !config.enableThreadCreation) {
        await persistNonWriteAction({ memory, store, proposal, candidate, status: 'blocked', note: 'thread_creation_disabled' });
        continue;
      }

      if (proposal.action === 'reply') {
        const action = await executeReply({ client, memory, store, proposal, candidate, config, now });
        if (['published', 'published_unverified', 'uncertain'].includes(action.status)) writesThisRun += 1;
        runCounters.writesThisRun = writesThisRun;
        continue;
      }

      await persistNonWriteAction({ memory, store, proposal, candidate, status: 'blocked', note: 'unsupported_v0_action' });
    }

    if (Number.isInteger(discovery.inboxPage?.resume_after)) {
      await client.acknowledgeInbox(discovery.inboxPage.resume_after);
      setCursor(memory, 'inbox', discovery.inboxPage.resume_after);
    }
    if (Number.isInteger(discovery.activityPage?.newest_cursor)) {
      setCursor(memory, 'activity', discovery.activityPage.newest_cursor);
    }

    const finishedAt = new Date().toISOString();
    appendRunLog(memory, makeRunRecord({
      runId,
      phase: 'cycle',
      status: 'ok',
      startedAt,
      finishedAt,
      counters: { ...runCounters },
      metadata: {
        writeMode: config.writeMode,
        inboxCursor: memory.cursors.inbox,
        activityCursor: memory.cursors.activity,
      },
    }));
    const pilotSnapshot = recordPilotRun(memory, {
      at: new Date(finishedAt),
      writeMode: config.writeMode,
      status: 'ok',
      counters: runCounters,
      usage: providerUsage(provider),
    });
    await store.save(memory);

    return {
      ok: true,
      runId,
      candidates: candidates.length,
      researched,
      writesThisRun,
      writeMode: config.writeMode,
      cursors: { ...memory.cursors },
      pilot: pilotSnapshot,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    appendRunLog(memory, makeRunRecord({
      runId,
      phase: 'cycle',
      status: 'error',
      startedAt,
      finishedAt,
      error,
      counters: { ...runCounters },
      metadata: { writeMode: config.writeMode },
    }));
    recordPilotRun(memory, {
      at: new Date(finishedAt),
      writeMode: config.writeMode,
      status: 'error',
      counters: runCounters,
      usage: providerUsage(provider),
      errorCode: error.code || error.name,
    });
    await store.save(memory);
    throw error;
  }
}

export { PUBLIC_PRODUCT_CONTEXT };
