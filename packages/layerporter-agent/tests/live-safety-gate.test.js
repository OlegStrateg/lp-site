import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentConfig } from '../src/config.js';
import { createEmptyMemory } from '../src/memory-schema.js';
import { evaluateLiveSafety } from '../src/live-safety-gate.js';

const LIVE_ENV = Object.freeze({
  LAYERPORTER_AGENT_WRITE_MODE: 'live',
  LAYERPORTER_AGENT_LIVE_ACTIVATED_AT: '2026-09-12T05:00:00Z',
  LAYERPORTER_AGENT_LIVE_HARD_STOP_AT: '2026-09-26T05:00:00Z',
});

test('config honors live mode only inside the explicit bounded window', () => {
  const env = {
    ...LIVE_ENV,
    LAYERPORTER_AGENT_MAX_WRITES_PER_RUN: '1',
    LAYERPORTER_AGENT_MAX_DAILY_WRITES: '2',
    LAYERPORTER_AGENT_MAX_RESEARCH_PER_RUN: '2',
    LAYERPORTER_AGENT_MIN_LIVE_OPPORTUNITY_SCORE: '0.72',
    LAYERPORTER_AGENT_MIN_LIVE_EVIDENCE_SCORE: '0.82',
  };

  const before = createAgentConfig(env, new Date('2026-09-12T04:59:59Z'));
  assert.equal(before.requestedWriteMode, 'live');
  assert.equal(before.writeMode, 'dry-run');

  const active = createAgentConfig(env, new Date('2026-09-12T05:00:00Z'));
  assert.equal(active.requestedWriteMode, 'live');
  assert.equal(active.writeMode, 'live');
  assert.equal(active.liveActivatedAt, '2026-09-12T05:00:00.000Z');
  assert.equal(active.maxWritesPerRun, 1);
  assert.equal(active.maxDailyWrites, 2);
  assert.equal(active.maxResearchPerRun, 2);
  assert.equal(active.minimumLiveOpportunityScore, 0.72);
  assert.equal(active.minimumLiveEvidenceScore, 0.82);

  const after = createAgentConfig(env, new Date('2026-09-26T05:00:00Z'));
  assert.equal(after.requestedWriteMode, 'live');
  assert.equal(after.writeMode, 'dry-run');
});

test('live request without both owner bounds fails closed to dry-run', () => {
  const config = createAgentConfig({ LAYERPORTER_AGENT_WRITE_MODE: 'live' }, new Date('2026-09-12T05:00:00Z'));
  assert.equal(config.requestedWriteMode, 'live');
  assert.equal(config.writeMode, 'dry-run');
});

test('live safety blocks unresolved publication uncertainty', () => {
  const memory = createEmptyMemory();
  memory.actions['a-1'] = { id: 'a-1', status: 'uncertain' };
  const config = createAgentConfig(LIVE_ENV, new Date('2026-09-12T05:00:00Z'));

  assert.deepEqual(
    evaluateLiveSafety(memory, config, new Date('2026-09-12T05:00:00Z')),
    { allowed: false, reason: 'unsafe_previous_publication', actionId: 'a-1' },
  );
});

test('one failed live write after activation trips the write circuit breaker', () => {
  const memory = createEmptyMemory();
  memory.actions['failed-live-write'] = {
    id: 'failed-live-write',
    status: 'failed',
    createdAt: '2026-09-12T05:01:00Z',
  };
  const config = createAgentConfig(LIVE_ENV, new Date('2026-09-12T06:00:00Z'));

  assert.deepEqual(
    evaluateLiveSafety(memory, config, new Date('2026-09-12T06:00:00Z')),
    { allowed: false, reason: 'live_circuit_breaker_write_failure', actionId: 'failed-live-write' },
  );
});

test('failed writes from before the current activation do not poison a new owner-authorized window', () => {
  const memory = createEmptyMemory();
  memory.actions['old-failed-write'] = {
    id: 'old-failed-write',
    status: 'failed',
    createdAt: '2026-09-12T04:59:00Z',
  };
  const config = createAgentConfig(LIVE_ENV, new Date('2026-09-12T06:00:00Z'));

  assert.deepEqual(
    evaluateLiveSafety(memory, config, new Date('2026-09-12T06:00:00Z')),
    { allowed: true, reason: null },
  );
});

test('one live runtime error after activation trips the write circuit breaker', () => {
  const memory = createEmptyMemory();
  memory.runLog.push({
    runId: 'run-live-error',
    status: 'error',
    startedAt: '2026-09-12T05:01:00Z',
    metadata: { writeMode: 'live' },
  });
  const config = createAgentConfig(LIVE_ENV, new Date('2026-09-12T06:00:00Z'));

  assert.deepEqual(
    evaluateLiveSafety(memory, config, new Date('2026-09-12T06:00:00Z')),
    { allowed: false, reason: 'live_circuit_breaker_runtime_error', runId: 'run-live-error' },
  );
});

test('runtime errors from before the current activation do not poison a new owner-authorized window', () => {
  const memory = createEmptyMemory();
  memory.runLog.push({
    runId: 'old-run-error',
    status: 'error',
    startedAt: '2026-09-12T04:59:00Z',
    metadata: { writeMode: 'live' },
  });
  const config = createAgentConfig(LIVE_ENV, new Date('2026-09-12T06:00:00Z'));

  assert.deepEqual(
    evaluateLiveSafety(memory, config, new Date('2026-09-12T06:00:00Z')),
    { allowed: true, reason: null },
  );
});

test('live safety blocks when dynamic 14-day pilot window is complete', () => {
  const memory = createEmptyMemory();
  memory.pilot = {
    liveStartedAt: '2026-09-12T05:00:00Z',
    liveEndsAt: '2026-09-26T05:00:00Z',
    latestSnapshot: null,
  };
  const config = createAgentConfig({
    ...LIVE_ENV,
    LAYERPORTER_AGENT_LIVE_HARD_STOP_AT: '2026-09-27T05:00:00Z',
  }, new Date('2026-09-26T05:00:00Z'));

  assert.deepEqual(
    evaluateLiveSafety(memory, config, new Date('2026-09-26T05:00:00Z')),
    { allowed: false, reason: 'pilot_window_complete' },
  );
});

test('live safety blocks owner review states and otherwise allows bounded live', () => {
  const memory = createEmptyMemory();
  const config = createAgentConfig(LIVE_ENV, new Date('2026-09-12T05:00:00Z'));

  memory.pilot = { latestSnapshot: { strategyRecommendation: 'REVIEW_RUNTIME_RELIABILITY' } };
  assert.equal(evaluateLiveSafety(memory, config, new Date('2026-09-12T05:00:00Z')).reason, 'runtime_reliability_review');

  memory.pilot.latestSnapshot.strategyRecommendation = 'STOP_AND_REVIEW';
  assert.equal(evaluateLiveSafety(memory, config, new Date('2026-09-12T05:00:00Z')).reason, 'pilot_stop_and_review');

  memory.pilot.latestSnapshot.strategyRecommendation = 'COLLECT_BASELINE';
  assert.deepEqual(evaluateLiveSafety(memory, config, new Date('2026-09-12T05:00:00Z')), { allowed: true, reason: null });
});
