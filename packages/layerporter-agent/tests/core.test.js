import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyMemory, resetDailyBudget, setCursor } from '../src/memory-schema.js';
import { evaluateActionProposal } from '../src/action-policy.js';
import { rankOpportunities } from '../src/opportunity-ranker.js';
import { sanitizeForLog } from '../src/observability.js';
import { recordReputationEvent, reputationSummary } from '../src/reputation-ledger.js';

function validProposal(overrides = {}) {
  return {
    action: 'reply',
    competency: 'website-image-optimization',
    opportunityScore: 0.9,
    evidenceScore: 0.9,
    evidence: [{ url: 'https://example.com', claim: 'x', support: 'supports' }],
    claims: [{ text: 'x', status: 'verified', presentedAsFact: true }],
    body: 'Claim. Evidence. Method. Limits.',
    sourceMessageId: 'source-1',
    sourceContentHash: 'abc',
    sourceFetchedAt: new Date().toISOString(),
    containsPrivateContext: false,
    requiresNewPermission: false,
    ...overrides,
  };
}

test('action policy allows a bounded evidence-backed reply', () => {
  assert.deepEqual(evaluateActionProposal(validProposal()), { allowed: true, reasons: [] });
});

test('action policy blocks secrets, permission expansion and weak evidence', () => {
  const result = evaluateActionProposal(validProposal({
    evidenceScore: 0.2,
    body: 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789',
    requiresNewPermission: true,
  }));
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes('evidence_below_threshold'));
  assert.ok(result.reasons.includes('secret_like_text_detected'));
  assert.ok(result.reasons.includes('permission_expansion_requested'));
});

test('opportunity ranking applies positive evidence and risk penalties', () => {
  const [winner] = rankOpportunities([
    { id: 'strong', features: { relevance: 1, novelty: 0.9, evidence: 1, participantQuality: 0.8, continuation: 0.8, externalArtifact: 0.7, noise: 0, risk: 0, cost: 0.1 } },
    { id: 'noisy', features: { relevance: 1, novelty: 1, evidence: 0.5, participantQuality: 0.5, continuation: 0.5, externalArtifact: 0.2, noise: 1, risk: 1, cost: 1 } },
  ]);
  assert.equal(winner.id, 'strong');
  assert.ok(winner.opportunityScore > 0.7);
});

test('memory cursors are monotonic and daily budget resets on UTC day', () => {
  const memory = createEmptyMemory();
  setCursor(memory, 'inbox', 10);
  assert.throws(() => setCursor(memory, 'inbox', 9), /Cursor regression/);
  resetDailyBudget(memory, new Date('2026-09-11T10:00:00Z'));
  memory.budget.writes = 5;
  resetDailyBudget(memory, new Date('2026-09-12T00:00:01Z'));
  assert.equal(memory.budget.writes, 0);
  assert.equal(memory.budget.utcDate, '2026-09-12');
});

test('observability redacts credential-like fields and hashes content fields', () => {
  const result = sanitizeForLog({ apiKey: 'secret-value', body: 'private body', status: 'ok' });
  assert.equal(result.apiKey, '[REDACTED]');
  assert.equal(result.status, 'ok');
  assert.equal(typeof result.body.sha256, 'string');
  assert.equal(result.body.bytes, Buffer.byteLength('private body'));
});

test('reputation events are idempotent by event id', () => {
  const memory = createEmptyMemory();
  recordReputationEvent(memory, { id: 'mention:1', type: 'inbound_mention', sourceId: '1' });
  recordReputationEvent(memory, { id: 'mention:1', type: 'inbound_mention', sourceId: '1' });
  const summary = reputationSummary(memory);
  assert.equal(summary.metrics.inboundMentions, 1);
  assert.equal(summary.highestLevel, 2);
});
