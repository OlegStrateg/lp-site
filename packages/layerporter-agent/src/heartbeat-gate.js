import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export function evaluateHeartbeat(heartbeat, gateMs, {
  expectedWriteMode = 'dry-run',
  maxWrites = 0,
} = {}) {
  const started = Date.parse(heartbeat?.startedAt || '');
  const isFresh = Number.isFinite(started) && started >= Number(gateMs);
  const isFinished = Boolean(heartbeat?.finishedAt);

  if (!isFresh || !isFinished) {
    return { status: 'pending', code: 1 };
  }

  if (heartbeat?.ok !== true) {
    return {
      status: 'runtime_error',
      code: 2,
      error: heartbeat?.error || null,
    };
  }

  const modeMatches = heartbeat?.writeMode === expectedWriteMode;
  const resultOk = heartbeat?.result?.ok === true;
  const writes = Number(heartbeat?.result?.writesThisRun ?? -1);
  const writesSafe = Number.isInteger(writes) && writes >= 0 && writes <= maxWrites;
  const recommendation = heartbeat?.result?.pilot?.strategyRecommendation || null;
  const unsafeRecommendation = ['STOP_AND_REVIEW', 'REVIEW_RUNTIME_RELIABILITY'].includes(recommendation);
  const uncertainActions = Number(heartbeat?.result?.pilot?.guardrails?.uncertainActions || 0);
  const publishedUnverifiedActions = Number(heartbeat?.result?.pilot?.guardrails?.publishedUnverifiedActions || 0);

  if (!modeMatches || !resultOk || !writesSafe || unsafeRecommendation || uncertainActions > 0 || publishedUnverifiedActions > 0) {
    return {
      status: 'invalid_result',
      code: 2,
      error: {
        writeMode: heartbeat?.writeMode ?? null,
        expectedWriteMode,
        resultOk,
        writesThisRun: heartbeat?.result?.writesThisRun ?? null,
        maxWrites,
        recommendation,
        uncertainActions,
        publishedUnverifiedActions,
      },
    };
  }

  return {
    status: 'pass',
    code: 0,
    summary: {
      ok: true,
      startedAt: heartbeat.startedAt,
      finishedAt: heartbeat.finishedAt,
      writeMode: heartbeat.writeMode,
      result: {
        ok: heartbeat.result.ok,
        candidates: heartbeat.result.candidates,
        researched: heartbeat.result.researched,
        writesThisRun: heartbeat.result.writesThisRun,
        strategyRecommendation: recommendation,
      },
    },
  };
}

function runCli() {
  const [filePath, gateArg, expectedModeArg = 'dry-run', maxWritesArg = '0'] = process.argv.slice(2);
  if (!filePath || !gateArg) {
    console.error('Usage: node heartbeat-gate.js HEARTBEAT_JSON GATE_MS [EXPECTED_WRITE_MODE] [MAX_WRITES]');
    process.exit(2);
  }
  if (!['dry-run', 'live'].includes(expectedModeArg)) {
    console.error('EXPECTED_WRITE_MODE must be dry-run or live');
    process.exit(2);
  }
  const maxWrites = Number(maxWritesArg);
  if (!Number.isInteger(maxWrites) || maxWrites < 0 || maxWrites > 3) {
    console.error('MAX_WRITES must be an integer between 0 and 3');
    process.exit(2);
  }

  const heartbeat = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const result = evaluateHeartbeat(heartbeat, Number(gateArg), {
    expectedWriteMode: expectedModeArg,
    maxWrites,
  });
  if (result.status === 'pass') console.log(JSON.stringify(result.summary));
  if (result.code === 2) console.error(JSON.stringify({ status: result.status, error: result.error }));
  process.exit(result.code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
