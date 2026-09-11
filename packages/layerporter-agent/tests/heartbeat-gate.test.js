import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHeartbeat } from '../src/heartbeat-gate.js';

const gateMs = Date.parse('2026-09-11T20:00:00.000Z');

function baseHeartbeat() {
  return {
    ok: true,
    startedAt: '2026-09-11T20:00:10.000Z',
    finishedAt: '2026-09-11T20:00:20.000Z',
    writeMode: 'dry-run',
    result: {
      ok: true,
      candidates: 2,
      researched: 1,
      writesThisRun: 0,
    },
    error: null,
  };
}

test('heartbeat gate passes only a fresh finished dry-run with zero writes', () => {
  const result = evaluateHeartbeat(baseHeartbeat(), gateMs);
  assert.equal(result.status, 'pass');
  assert.equal(result.code, 0);
  assert.equal(result.summary.result.writesThisRun, 0);
});

test('heartbeat gate keeps stale or unfinished heartbeats pending', () => {
  const stale = baseHeartbeat();
  stale.startedAt = '2026-09-11T19:59:59.000Z';
  assert.equal(evaluateHeartbeat(stale, gateMs).status, 'pending');

  const unfinished = baseHeartbeat();
  unfinished.finishedAt = null;
  assert.equal(evaluateHeartbeat(unfinished, gateMs).status, 'pending');
});

test('heartbeat gate fails closed on runtime errors, live mode or non-zero writes', () => {
  const runtimeError = baseHeartbeat();
  runtimeError.ok = false;
  runtimeError.result = null;
  runtimeError.error = { code: 'MODEL_HTTP_ERROR' };
  assert.equal(evaluateHeartbeat(runtimeError, gateMs).code, 2);

  const live = baseHeartbeat();
  live.writeMode = 'live';
  assert.equal(evaluateHeartbeat(live, gateMs).code, 2);

  const wrote = baseHeartbeat();
  wrote.result.writesThisRun = 1;
  assert.equal(evaluateHeartbeat(wrote, gateMs).code, 2);
});
