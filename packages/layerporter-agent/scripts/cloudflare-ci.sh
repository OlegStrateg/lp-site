#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

echo "LayerPorter Agent Cloudflare CI"
echo "branch=${WORKERS_CI_BRANCH:-local} commit=${WORKERS_CI_COMMIT_SHA:-unknown}"

bash -n packages/layerporter-agent/scripts/cloudflare-ci.sh
bash -n packages/layerporter-agent/scripts/cloudflare-deploy.sh

node --test packages/layerporter-agent/tests/*.test.js

while IFS= read -r file; do
  node --check "$file" >/dev/null
done < <(find packages/layerporter-agent/src -type f -name '*.js' | sort)

node - <<'NODE'
const fs = require('fs');
const path = 'packages/layerporter-agent/pilot-control.json';
if (!fs.existsSync(path)) process.exit(0);
const c = JSON.parse(fs.readFileSync(path, 'utf8'));
if (c.id !== 'LP-097') throw new Error('Unexpected pilot id');
if (c.authorizedBy !== 'owner') throw new Error('Live pilot must be owner-authorized');
if (!Number.isInteger(c.maxResearchPerRun) || c.maxResearchPerRun < 1 || c.maxResearchPerRun > 2) throw new Error('Invalid maxResearchPerRun');
if (c.maxWritesPerRun !== 1) throw new Error('maxWritesPerRun must equal 1');
if (!Number.isInteger(c.maxDailyWrites) || c.maxDailyWrites < 1 || c.maxDailyWrites > 2) throw new Error('Invalid maxDailyWrites');
if (!(c.minimumOpportunityScore >= 0.72 && c.minimumOpportunityScore <= 1)) throw new Error('Invalid minimumOpportunityScore');
if (!(c.minimumEvidenceScore >= 0.82 && c.minimumEvidenceScore <= 1)) throw new Error('Invalid minimumEvidenceScore');
if (c.enableThreadCreation !== false) throw new Error('Thread creation must stay disabled');
const start = Date.parse(c.activatedAt);
const stop = Date.parse(c.hardStopAt);
if (!Number.isFinite(start) || !Number.isFinite(stop) || stop <= start) throw new Error('Invalid pilot timestamps');
if (stop - start > 15 * 24 * 60 * 60 * 1000) throw new Error('Pilot hard stop exceeds 15 days');
NODE

# Non-production diagnostic only: read the already-existing dedicated remote KV.
# No deploy, schedule mutation, secret mutation, KV write, or PostingBoard write occurs here.
if [ "${WORKERS_CI_BRANCH:-}" = 'diag/LP-097-live-heartbeat-1600' ]; then
  WRANGLER=(npx --yes wrangler@4.131.1)
  KV_LIST="$(${WRANGLER[@]} kv namespace list)"
  KV_ID="$(printf '%s' "$KV_LIST" | node -e '
    const fs=require("fs");
    const rows=JSON.parse(fs.readFileSync(0,"utf8"));
    const x=rows.find((r)=>r.title==="layerporter-agent-state");
    if(!x?.id) process.exit(2);
    process.stdout.write(String(x.id));
  ')"
  test -n "$KV_ID"

  ${WRANGLER[@]} kv key get 'layerporter-agent:heartbeat:v1' --namespace-id "$KV_ID" --remote > /tmp/lp-heartbeat.json
  ${WRANGLER[@]} kv key get 'layerporter-agent:memory:v1' --namespace-id "$KV_ID" --remote > /tmp/lp-memory.json

  node --input-type=module <<'NODE'
  import fs from 'node:fs';
  import { evaluateHeartbeat } from './packages/layerporter-agent/src/heartbeat-gate.js';
  import { evaluateLiveSafety } from './packages/layerporter-agent/src/live-safety-gate.js';
  import { createAgentConfig } from './packages/layerporter-agent/src/config.js';

  const control = JSON.parse(fs.readFileSync('packages/layerporter-agent/pilot-control.json','utf8'));
  const heartbeat = JSON.parse(fs.readFileSync('/tmp/lp-heartbeat.json','utf8'));
  const memory = JSON.parse(fs.readFileSync('/tmp/lp-memory.json','utf8'));
  const activatedMs = Date.parse(control.activatedAt || '');
  const startedMs = Date.parse(heartbeat.startedAt || '');
  const finishedMs = Date.parse(heartbeat.finishedAt || '');
  const now = new Date();

  if (!Number.isFinite(activatedMs) || !Number.isFinite(startedMs) || !Number.isFinite(finishedMs)) throw new Error('invalid heartbeat timestamps');
  if (startedMs < activatedMs) throw new Error('heartbeat predates live activation');
  if (now.getTime() - startedMs > 90*60*1000) throw new Error('heartbeat stale >90m');
  if (heartbeat.ok !== true) throw new Error(`heartbeat ok=false error=${heartbeat.error?.code || heartbeat.error?.message || 'unknown'}`);
  if (heartbeat.writeMode !== 'live') throw new Error(`writeMode=${heartbeat.writeMode}`);
  if (!heartbeat.result || typeof heartbeat.result !== 'object') throw new Error('missing heartbeat result');
  if ((heartbeat.result.writesThisRun ?? 0) > Number(control.maxWritesPerRun)) throw new Error('writesThisRun exceeds bound');

  const hb = evaluateHeartbeat(heartbeat, activatedMs, {expectedWriteMode:'live', maxWrites:Number(control.maxWritesPerRun)});
  if (hb.code !== 0) throw new Error(`heartbeat gate failed: ${hb.status}`);

  const config = createAgentConfig({
    LAYERPORTER_AGENT_WRITE_MODE:'live',
    LAYERPORTER_AGENT_LIVE_ACTIVATED_AT:control.activatedAt,
    LAYERPORTER_AGENT_LIVE_HARD_STOP_AT:control.hardStopAt,
    LAYERPORTER_AGENT_MAX_RESEARCH_PER_RUN:String(control.maxResearchPerRun),
    LAYERPORTER_AGENT_MAX_WRITES_PER_RUN:String(control.maxWritesPerRun),
    LAYERPORTER_AGENT_MAX_DAILY_WRITES:String(control.maxDailyWrites),
    LAYERPORTER_AGENT_MIN_LIVE_OPPORTUNITY_SCORE:String(control.minimumOpportunityScore),
    LAYERPORTER_AGENT_MIN_LIVE_EVIDENCE_SCORE:String(control.minimumEvidenceScore),
    LAYERPORTER_AGENT_ENABLE_THREAD_CREATION:String(control.enableThreadCreation),
  }, now);
  const safety = evaluateLiveSafety(memory, config, now);
  if (!safety.allowed) throw new Error(`circuit breaker closed: ${safety.reason}`);

  const serialized = JSON.stringify(memory);
  if (/published_unverified|"status"\s*:\s*"uncertain"|"status"\s*:\s*"failed"/i.test(serialized)) {
    throw new Error('unsafe publication state present in memory');
  }

  if ((heartbeat.result.writesThisRun ?? 0) > 0) {
    throw new Error('LIVE_WRITE_OCCURRED_REQUIRES_EXTERNAL_POSTINGBOARD_READBACK');
  }

  console.log(`LP097_LIVE_HEARTBEAT_PASS startedAt=${heartbeat.startedAt} finishedAt=${heartbeat.finishedAt} writesThisRun=${heartbeat.result.writesThisRun ?? 0}`);
NODE
fi

echo "CLOUDFLARE CI PASS"
