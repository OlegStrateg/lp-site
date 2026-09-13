import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { evaluateHeartbeat } from './heartbeat-gate.js';
import { evaluateLiveSafety } from './live-safety-gate.js';
import { createAgentConfig } from './config.js';

function fail(reason) {
  return { ok: false, reason };
}

function controlEnv(control) {
  return {
    LAYERPORTER_AGENT_WRITE_MODE: control.enabled === true ? 'live' : 'dry-run',
    LAYERPORTER_AGENT_LIVE_ACTIVATED_AT: control.activatedAt,
    LAYERPORTER_AGENT_LIVE_HARD_STOP_AT: control.hardStopAt,
    LAYERPORTER_AGENT_MAX_RESEARCH_PER_RUN: String(control.maxResearchPerRun),
    LAYERPORTER_AGENT_MAX_WRITES_PER_RUN: String(control.maxWritesPerRun),
    LAYERPORTER_AGENT_MAX_DAILY_WRITES: String(control.maxDailyWrites),
    LAYERPORTER_AGENT_MIN_LIVE_OPPORTUNITY_SCORE: String(control.minimumOpportunityScore),
    LAYERPORTER_AGENT_MIN_LIVE_EVIDENCE_SCORE: String(control.minimumEvidenceScore),
    LAYERPORTER_AGENT_ENABLE_THREAD_CREATION: String(control.enableThreadCreation),
  };
}

function actionTimestamp(action) {
  const value = action?.updatedAt || action?.createdAt || '';
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function evaluateRuntimeAudit({ heartbeat, memory, control, request, now = new Date() }) {
  if (request?.id !== 'LP-097' || request?.requestedBy !== 'owner' || request?.enabled !== true) {
    return fail('audit_request_not_owner_enabled');
  }
  if (control?.id !== 'LP-097' || control?.authorizedBy !== 'owner' || control?.enabled !== true) {
    return fail('live_pilot_not_owner_enabled');
  }
  if (request.expectedWriteMode !== 'live') return fail('unexpected_requested_mode');
  if (!Number.isInteger(request.maxWritesPerRun) || request.maxWritesPerRun < 0 || request.maxWritesPerRun > 1) {
    return fail('invalid_audit_max_writes');
  }
  const maxAgeMinutes = Number(request.maxHeartbeatAgeMinutes);
  if (!Number.isFinite(maxAgeMinutes) || maxAgeMinutes < 1 || maxAgeMinutes > 180) {
    return fail('invalid_heartbeat_age_bound');
  }

  const gateMs = Date.parse(request.minimumHeartbeatAt || '');
  const startedMs = Date.parse(heartbeat?.startedAt || '');
  const finishedMs = Date.parse(heartbeat?.finishedAt || '');
  if (!Number.isFinite(gateMs) || !Number.isFinite(startedMs) || !Number.isFinite(finishedMs)) {
    return fail('invalid_runtime_timestamps');
  }
  if (now.getTime() - startedMs > maxAgeMinutes * 60 * 1000) return fail('heartbeat_stale');

  const heartbeatGate = evaluateHeartbeat(heartbeat, gateMs, {
    expectedWriteMode: 'live',
    maxWrites: request.maxWritesPerRun,
  });
  if (heartbeatGate.code !== 0) return fail(`heartbeat_${heartbeatGate.status}`);

  const config = createAgentConfig(controlEnv(control), now);
  const safety = evaluateLiveSafety(memory, config, now);
  if (!safety.allowed) return fail(`circuit_breaker_${safety.reason}`);

  const writes = Number(heartbeat?.result?.writesThisRun ?? -1);
  let verifiedPublications = 0;
  if (writes > 0) {
    const slackMs = 5_000;
    verifiedPublications = Object.values(memory?.actions || {}).filter((action) => {
      const at = actionTimestamp(action);
      return at != null
        && at >= startedMs - slackMs
        && at <= finishedMs + slackMs
        && action.status === 'published'
        && action.readbackVerified === true
        && Boolean(action.publicationId || action.publicationUrl);
    }).length;
    if (verifiedPublications < writes) return fail('publication_readback_missing');
  }

  return {
    ok: true,
    summary: {
      startedAt: heartbeat.startedAt,
      finishedAt: heartbeat.finishedAt,
      writeMode: heartbeat.writeMode,
      writesThisRun: writes,
      candidates: heartbeat?.result?.candidates ?? null,
      researched: heartbeat?.result?.researched ?? null,
      strategyRecommendation: heartbeat?.result?.pilot?.strategyRecommendation ?? null,
      verifiedPublications,
    },
  };
}

function runCli() {
  const [heartbeatPath, memoryPath, controlPath, requestPath] = process.argv.slice(2);
  if (!heartbeatPath || !memoryPath || !controlPath || !requestPath) {
    console.error('Usage: node runtime-audit.js HEARTBEAT MEMORY PILOT_CONTROL AUDIT_REQUEST');
    process.exit(2);
  }
  try {
    const result = evaluateRuntimeAudit({
      heartbeat: JSON.parse(fs.readFileSync(heartbeatPath, 'utf8')),
      memory: JSON.parse(fs.readFileSync(memoryPath, 'utf8')),
      control: JSON.parse(fs.readFileSync(controlPath, 'utf8')),
      request: JSON.parse(fs.readFileSync(requestPath, 'utf8')),
      now: new Date(),
    });
    if (!result.ok) {
      console.error(JSON.stringify({ status: 'FAIL', reason: result.reason }));
      process.exit(2);
    }
    console.log(JSON.stringify({ status: 'PASS', ...result.summary }));
  } catch (error) {
    console.error(JSON.stringify({ status: 'ERROR', name: error.name, message: error.message }));
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
