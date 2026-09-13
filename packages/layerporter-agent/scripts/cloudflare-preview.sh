#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

CONTROL='packages/layerporter-agent/pilot-control.json'
DEPLOY='packages/layerporter-agent/scripts/cloudflare-deploy.sh'
WRANGLER=(npx --yes wrangler@4.131.1)

# This branch is diagnostic-only. It performs no Worker deploy and no KV mutation.
test -f "$CONTROL" || { echo "Missing $CONTROL"; exit 1; }
test -f "$DEPLOY" || { echo "Missing $DEPLOY"; exit 1; }

bash -n "$DEPLOY"
npm --prefix packages/layerporter-agent run check
npm --prefix packages/layerporter-agent test

KV_LIST="$(${WRANGLER[@]} kv namespace list)"
KV_ID="$(printf '%s' "$KV_LIST" | node -e '
  const fs=require("fs");
  const rows=JSON.parse(fs.readFileSync(0,"utf8"));
  const x=rows.find((r)=>r.title==="layerporter-agent-state");
  if(!x?.id) process.exit(2);
  process.stdout.write(String(x.id));
')"
test -n "$KV_ID" || { echo 'Dedicated LayerPorter Agent KV not found'; exit 1; }

${WRANGLER[@]} kv key get 'layerporter-agent:heartbeat:v1' --namespace-id "$KV_ID" --remote --text > /tmp/lp-agent-heartbeat.json
${WRANGLER[@]} kv key get 'layerporter-agent:memory:v1' --namespace-id "$KV_ID" --remote --text > /tmp/lp-agent-memory.json
chmod 600 /tmp/lp-agent-heartbeat.json /tmp/lp-agent-memory.json

node --input-type=module <<'NODE'
import fs from 'node:fs';
import { evaluateHeartbeat } from './packages/layerporter-agent/src/heartbeat-gate.js';
import { evaluateLiveSafety } from './packages/layerporter-agent/src/live-safety-gate.js';
import { createAgentConfig } from './packages/layerporter-agent/src/config.js';

const control = JSON.parse(fs.readFileSync('packages/layerporter-agent/pilot-control.json', 'utf8'));
const heartbeat = JSON.parse(fs.readFileSync('/tmp/lp-agent-heartbeat.json', 'utf8'));
const memory = JSON.parse(fs.readFileSync('/tmp/lp-agent-memory.json', 'utf8'));
const now = new Date();
const activatedMs = Date.parse(control.activatedAt || '');
const startedMs = Date.parse(heartbeat.startedAt || '');

if (!Number.isFinite(activatedMs) || !Number.isFinite(startedMs)) throw new Error('Invalid activation/heartbeat timestamp');
if (startedMs < activatedMs) throw new Error('Heartbeat predates current live activation');
if (now.getTime() - startedMs > 90 * 60 * 1000) throw new Error('Heartbeat stale >90m');

const hb = evaluateHeartbeat(heartbeat, activatedMs, {
  expectedWriteMode: 'live',
  maxWrites: Number(control.maxWritesPerRun),
});
if (hb.code !== 0) throw new Error(`Heartbeat gate failed: ${hb.status}`);
if (heartbeat.result?.writesThisRun !== 0) throw new Error('First live verification requires writesThisRun=0; use publication-readback diagnostic if a write occurred');

const config = createAgentConfig({
  LAYERPORTER_AGENT_WRITE_MODE: 'live',
  LAYERPORTER_AGENT_LIVE_ACTIVATED_AT: control.activatedAt,
  LAYERPORTER_AGENT_LIVE_HARD_STOP_AT: control.hardStopAt,
  LAYERPORTER_AGENT_MAX_RESEARCH_PER_RUN: String(control.maxResearchPerRun),
  LAYERPORTER_AGENT_MAX_WRITES_PER_RUN: String(control.maxWritesPerRun),
  LAYERPORTER_AGENT_MAX_DAILY_WRITES: String(control.maxDailyWrites),
  LAYERPORTER_AGENT_MIN_LIVE_OPPORTUNITY_SCORE: String(control.minimumOpportunityScore),
  LAYERPORTER_AGENT_MIN_LIVE_EVIDENCE_SCORE: String(control.minimumEvidenceScore),
  LAYERPORTER_AGENT_ENABLE_THREAD_CREATION: String(control.enableThreadCreation),
}, now);

const safety = evaluateLiveSafety(memory, config, now);
if (!safety.allowed) throw new Error(`Live circuit breaker closed: ${safety.reason}`);

console.log(JSON.stringify({
  status: 'PASS',
  startedAt: heartbeat.startedAt,
  finishedAt: heartbeat.finishedAt,
  writeMode: heartbeat.writeMode,
  writesThisRun: heartbeat.result?.writesThisRun,
  candidates: heartbeat.result?.candidates ?? null,
  researched: heartbeat.result?.researched ?? null,
  strategyRecommendation: heartbeat.result?.pilot?.strategyRecommendation ?? null,
}));
NODE

rm -f /tmp/lp-agent-heartbeat.json /tmp/lp-agent-memory.json

echo 'LP-097 READ-ONLY LIVE HEARTBEAT PASS: fresh live runtime, circuit breaker open, zero writes in verified cycle.'
