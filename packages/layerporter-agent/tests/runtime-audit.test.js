import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyMemory } from '../src/memory-schema.js';
import { evaluateRuntimeAudit } from '../src/runtime-audit.js';

const control = Object.freeze({
  id: 'LP-097',
  enabled: true,
  authorizedBy: 'owner',
  activatedAt: '2026-09-13T11:46:00Z',
  hardStopAt: '2026-09-27T11:46:00Z',
  maxResearchPerRun: 2,
  maxWritesPerRun: 1,
  maxDailyWrites: 2,
  minimumOpportunityScore: 0.72,
  minimumEvidenceScore: 0.82,
  enableThreadCreation: false,
});

const request = Object.freeze({
  id: 'LP-097',
  enabled: true,
  requestedBy: 'owner',
  minimumHeartbeatAt: '2026-09-13T12:59:00Z',
  expectedWriteMode: 'live',
  maxWritesPerRun: 1,
  maxHeartbeatAgeMinutes: 90,
});

function memoryWithPilot() {
  const memory = createEmptyMemory();
  memory.pilot = {
    liveStartedAt: '2026-09-13T13:00:00Z',
    liveEndsAt: '2026-09-27T13:00:00Z',
    latestSnapshot: { strategyRecommendation: 'COLLECT_BASELINE' },
  };
  return memory;
}

function heartbeat(overrides = {}) {
  return {
    ok: true,
    startedAt: '2026-09-13T13:00:00Z',
    finishedAt: '2026-09-13T13:00:10Z',
    writeMode: 'live',
    result: {
      ok: true,
      candidates: 0,
      researched: 0,
      writesThisRun: 0,
      pilot: {
        strategyRecommendation: 'COLLECT_BASELINE',
        guardrails: { uncertainActions: 0, publishedUnverifiedActions: 0 },
      },
    },
    ...overrides,
  };
}

test('passes a fresh safe live heartbeat with zero writes', () => {
  const result = evaluateRuntimeAudit({
    heartbeat: heartbeat(),
    memory: memoryWithPilot(),
    control,
    request,
    now: new Date('2026-09-13T13:10:00Z'),
  });
  assert.equal(result.ok, true);
  assert.equal(result.summary.writesThisRun, 0);
  assert.equal(result.summary.verifiedPublications, 0);
});

test('passes one bounded publication only when exact read-back was verified', () => {
  const memory = memoryWithPilot();
  memory.actions.a1 = {
    id: 'a1',
    type: 'reply',
    status: 'published',
    publicationId: 'p1',
    readbackVerified: true,
    createdAt: '2026-09-13T13:00:04Z',
    updatedAt: '2026-09-13T13:00:07Z',
  };
  const hb = heartbeat({
    result: {
      ok: true,
      candidates: 1,
      researched: 1,
      writesThisRun: 1,
      pilot: {
        strategyRecommendation: 'COLLECT_BASELINE',
        guardrails: { uncertainActions: 0, publishedUnverifiedActions: 0 },
      },
    },
  });
  const result = evaluateRuntimeAudit({
    heartbeat: hb,
    memory,
    control,
    request,
    now: new Date('2026-09-13T13:10:00Z'),
  });
  assert.equal(result.ok, true);
  assert.equal(result.summary.verifiedPublications, 1);
});

test('fails if a reported write lacks verified publication read-back', () => {
  const result = evaluateRuntimeAudit({
    heartbeat: heartbeat({
      result: {
        ok: true,
        writesThisRun: 1,
        pilot: {
          strategyRecommendation: 'COLLECT_BASELINE',
          guardrails: { uncertainActions: 0, publishedUnverifiedActions: 0 },
        },
      },
    }),
    memory: memoryWithPilot(),
    control,
    request,
    now: new Date('2026-09-13T13:10:00Z'),
  });
  assert.deepEqual(result, { ok: false, reason: 'publication_readback_missing' });
});

test('fails on stale heartbeat and on a tripped live circuit breaker', () => {
  const stale = evaluateRuntimeAudit({
    heartbeat: heartbeat(),
    memory: memoryWithPilot(),
    control,
    request,
    now: new Date('2026-09-13T15:00:00Z'),
  });
  assert.deepEqual(stale, { ok: false, reason: 'heartbeat_stale' });

  const memory = memoryWithPilot();
  memory.runLog.push({
    runId: 'bad-live-run',
    status: 'error',
    startedAt: '2026-09-13T13:00:00Z',
    metadata: { writeMode: 'live' },
  });
  const unsafe = evaluateRuntimeAudit({
    heartbeat: heartbeat(),
    memory,
    control,
    request,
    now: new Date('2026-09-13T13:10:00Z'),
  });
  assert.equal(unsafe.ok, false);
  assert.equal(unsafe.reason, 'circuit_breaker_live_circuit_breaker_runtime_error');
});
