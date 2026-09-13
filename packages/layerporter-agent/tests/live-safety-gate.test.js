import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentConfig } from '../src/config.js';
import { createEmptyMemory } from '../src/memory-schema.js';
import { evaluateLiveSafety } from '../src/live-safety-gate.js';

test('config honors live mode only before the absolute hard stop', () => {
  const env = {
    LAYERPORTER_AGENT_WRITE_MODE: 'live',
    LAYERPORTER_AGENT_LIVE_HARD_STOP_AT: '2026-09-26T05:00:00Z',
    LAYERPORTER_AGENT_MAX_WRITES_PER_RUN: '1',
    LAYERPORTER_AGENT_MAX_DAILY_WRITES: '2',
    LAYERPORTER_AGENT_MAX_RESEARCH_PER_RUN: '2',
    LAYERPORTER_AGENT_MIN_LIVE_OPPORTUNITY_SCORE: '0.72',
    LAYERPORTER_AGENT_MIN_LIVE_EVIDENCE_SCORE: '0.82',
  };

  const before = createAgentConfig(env, new Date('2026-09-26T04:59:59Z'));
  assert.equal(before.requestedWriteMode, 'live');
  assert.equal(before.writeMode, 'live');
  assert.equal(before.maxWritesPerRun, 1);
  assert.equal(before.maxDailyWrites, 2);
  assert.equal(before.maxResearchPerRun, 2);
  assert.equal(before.minimumLiveOpportunityScore, 0.72);
  assert.equal(before.minimumLiveEvidenceScore, 0.82);

  const after = createAgentConfig(env, new Date('2026-09-26T05:00:00Z'));
  assert.equal(after.requestedWriteMode, 'live');
  assert.equal(after.writeMode, 'dry-run');
});

test('live safety blocks unresolved publication uncertainty', () => {
  const memory = createEmptyMemory();
  memory.actions['a-1'] = { id: 'a-1', status: 'uncertain' };
  const config = createAgentConfig({
    LAYERPORTER_AGENT_WRITE_MODE: 'live',
    LAYERPORTER_AGENT_LIVE_HARD_STOP_AT: '2026-09-26T05:00:00Z',
  }, new Date('2026-09-12T05:00:00Z'));

  assert.deepEqual(
    evaluateLiveSafety(memory, config, new Date('2026-09-12T05:00:00Z')),
    { allowed: false, reason: 'unsafe_previous_publication', actionId: 'a-1' },
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
    LAYERPORTER_AGENT_WRITE_MODE: 'live',
    LAYERPORTER_AGENT_LIVE_HARD_STOP_AT: '2026-09-27T05:00:00Z',
  }, new Date('2026-09-26T05:00:00Z'));

  assert.deepEqual(
    evaluateLiveSafety(memory, config, new Date('2026-09-26T05:00:00Z')),
    { allowed: false, reason: 'pilot_window_complete' },
  );
});

test('live safety blocks owner review states and otherwise allows bounded live', () => {
  const memory = createEmptyMemory();
  const config = createAgentConfig({
    LAYERPORTER_AGENT_WRITE_MODE: 'live',
    LAYERPORTER_AGENT_LIVE_HARD_STOP_AT: '2026-09-26T05:00:00Z',
  }, new Date('2026-09-12T05:00:00Z'));

  memory.pilot = { latestSnapshot: { strategyRecommendation: 'REVIEW_RUNTIME_RELIABILITY' } };
  assert.equal(evaluateLiveSafety(memory, config, new Date('2026-09-12T05:00:00Z')).reason, 'runtime_reliability_review');

  memory.pilot.latestSnapshot.strategyRecommendation = 'STOP_AND_REVIEW';
  assert.equal(evaluateLiveSafety(memory, config, new Date('2026-09-12T05:00:00Z')).reason, 'pilot_stop_and_review');

  memory.pilot.latestSnapshot.strategyRecommendation = 'COLLECT_BASELINE';
  assert.deepEqual(evaluateLiveSafety(memory, config, new Date('2026-09-12T05:00:00Z')), { allowed: true, reason: null });
});
