import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyMemory, upsertEntity } from '../src/memory-schema.js';
import { recordReputationEvent } from '../src/reputation-ledger.js';
import { buildPilotSnapshot, preparePilotMeasurement, recordPilotRun } from '../src/pilot-measurement.js';

test('dry-run telemetry does not start the 14-day live pilot', () => {
  const memory = createEmptyMemory();
  const at = new Date('2026-09-11T20:37:52Z');
  const snapshot = recordPilotRun(memory, {
    at,
    writeMode: 'dry-run',
    status: 'ok',
    counters: { inboxSeen: 2, activitySeen: 4, hydrated: 1, candidates: 1, researched: 1, writesThisRun: 0 },
    usage: { requests: 2, inputTokens: 100, outputTokens: 20, totalTokens: 120 },
  });

  assert.equal(memory.pilot.liveStartedAt, null);
  assert.equal(memory.pilot.liveEndsAt, null);
  assert.equal(snapshot.strategyRecommendation, 'AWAIT_LIVE_GATE');
  assert.equal(memory.pilot.daily['2026-09-11'].dryRun.modelUsage.totalTokens, 120);
  assert.equal(memory.pilot.daily['2026-09-11'].live.runs, 0);
});

test('first live cycle captures a clean baseline before live reputation deltas', () => {
  const memory = createEmptyMemory();
  memory.metrics.inboundMentions = 5;
  const start = new Date('2026-09-12T00:00:00Z');
  preparePilotMeasurement(memory, { now: start, writeMode: 'live' });

  recordReputationEvent(memory, {
    id: 'inbound_mention:live-1',
    type: 'inbound_mention',
    sourceId: 'live-1',
    agentId: 'agent-1',
    at: '2026-09-12T00:01:00Z',
  });
  upsertEntity(memory, 'relationships', 'agent-1', {
    interactionCount: 1,
    lastInteractionAt: '2026-09-12T00:01:00Z',
  }, '2026-09-12T00:01:00Z');

  const snapshot = recordPilotRun(memory, {
    at: new Date('2026-09-12T00:02:00Z'),
    writeMode: 'live',
    status: 'ok',
    counters: { writesThisRun: 1 },
    usage: { requests: 2, inputTokens: 200, outputTokens: 40, totalTokens: 240 },
  });

  assert.equal(memory.pilot.baseline.metrics.inboundMentions, 5);
  assert.equal(snapshot.reputation.liveMetricDelta.inboundMentions, 1);
  assert.equal(snapshot.reputation.l2PlusEvents, 1);
  assert.equal(snapshot.uniqueInboundAgents, 1);
  assert.equal(snapshot.output.modelUsage.totalTokens, 240);
  assert.equal(snapshot.strategyRecommendation, 'COLLECT_BASELINE');
  assert.equal(memory.pilot.liveEndsAt, '2026-09-26T00:00:00.000Z');
});

test('strategy recommendations are deterministic and never auto-apply adaptations', () => {
  const memory = createEmptyMemory();
  const start = new Date('2026-09-12T00:00:00Z');
  preparePilotMeasurement(memory, { now: start, writeMode: 'live' });

  assert.equal(buildPilotSnapshot(memory, { now: new Date('2026-09-15T00:00:01Z') }).strategyRecommendation, 'REVIEW_ROUTING_AND_TOPIC_FOCUS');

  recordReputationEvent(memory, {
    id: 'returning_agent:agent-1',
    type: 'returning_agent',
    sourceId: 'm-1',
    agentId: 'agent-1',
    at: '2026-09-15T01:00:00Z',
  });
  assert.equal(buildPilotSnapshot(memory, { now: new Date('2026-09-19T00:00:01Z') }).strategyRecommendation, 'DEEPEN_FOLLOWUPS_AND_RECEIPTS');

  recordReputationEvent(memory, {
    id: 'citation:c-1',
    type: 'citation',
    sourceId: 'c-1',
    agentId: 'agent-2',
    at: '2026-09-19T01:00:00Z',
  });
  assert.equal(buildPilotSnapshot(memory, { now: new Date('2026-09-20T00:00:00Z') }).strategyRecommendation, 'HOLD_AND_ACCUMULATE_EVIDENCE');
  assert.deepEqual(memory.pilot.adaptations, []);

  const finalSnapshot = buildPilotSnapshot(memory, { now: new Date('2026-09-26T00:00:01Z') });
  assert.equal(finalSnapshot.liveWindowComplete, true);
  assert.equal(finalSnapshot.strategyRecommendation, 'PARETO_GATE_READY');
});

test('uncertain publication forces stop-and-review recommendation', () => {
  const memory = createEmptyMemory();
  const start = new Date('2026-09-12T00:00:00Z');
  preparePilotMeasurement(memory, { now: start, writeMode: 'live' });
  memory.actions['a-1'] = {
    id: 'a-1',
    type: 'reply',
    status: 'uncertain',
    createdAt: '2026-09-12T00:01:00Z',
    updatedAt: '2026-09-12T00:01:00Z',
  };

  const snapshot = buildPilotSnapshot(memory, { now: new Date('2026-09-12T02:00:00Z') });
  assert.equal(snapshot.guardrails.uncertainActions, 1);
  assert.equal(snapshot.strategyRecommendation, 'STOP_AND_REVIEW');
});
