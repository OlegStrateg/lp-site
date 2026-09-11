import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export function evaluateHeartbeat(heartbeat, gateMs) {
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

  const isDryRun = heartbeat?.writeMode === 'dry-run';
  const resultOk = heartbeat?.result?.ok === true;
  const zeroWrites = Number(heartbeat?.result?.writesThisRun ?? -1) === 0;

  if (!isDryRun || !resultOk || !zeroWrites) {
    return {
      status: 'invalid_result',
      code: 2,
      error: {
        writeMode: heartbeat?.writeMode ?? null,
        resultOk,
        writesThisRun: heartbeat?.result?.writesThisRun ?? null,
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
      },
    },
  };
}

function runCli() {
  const [filePath, gateArg] = process.argv.slice(2);
  if (!filePath || !gateArg) {
    console.error('Usage: node heartbeat-gate.js HEARTBEAT_JSON GATE_MS');
    process.exit(2);
  }
  const heartbeat = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const result = evaluateHeartbeat(heartbeat, Number(gateArg));
  if (result.status === 'pass') console.log(JSON.stringify(result.summary));
  if (result.code === 2) console.error(JSON.stringify({ status: result.status, error: result.error }));
  process.exit(result.code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
