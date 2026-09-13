#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
echo "LayerPorter Agent Cloudflare CI"
echo "branch=${WORKERS_CI_BRANCH:-local} commit=${WORKERS_CI_COMMIT_SHA:-unknown}"
bash -n packages/layerporter-agent/scripts/cloudflare-ci.sh
bash -n packages/layerporter-agent/scripts/cloudflare-deploy.sh
node --test packages/layerporter-agent/tests/*.test.js
while IFS= read -r file; do node --check "$file" >/dev/null; done < <(find packages/layerporter-agent/src -type f -name '*.js' | sort)
node - <<'NODE'
const fs=require('fs');const c=JSON.parse(fs.readFileSync('packages/layerporter-agent/pilot-control.json','utf8'));if(c.id!=='LP-097'||c.authorizedBy!=='owner'||c.enabled!==true)throw new Error('pilot control inactive');if(c.maxWritesPerRun!==1||c.maxDailyWrites>2||c.enableThreadCreation!==false)throw new Error('pilot bounds invalid');
NODE
if [ "${WORKERS_CI_BRANCH:-}" = 'diag/LP-097-live-heartbeat-1600' ]; then
 W=(npx --yes wrangler@4.131.1); ${W[@]} kv namespace list >/tmp/lp-kv-list.json; KV_ID="$(node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("/tmp/lp-kv-list.json","utf8"));const x=r.find(v=>v.title==="layerporter-agent-state");if(!x?.id)process.exit(2);process.stdout.write(x.id)')"; ${W[@]} kv key get 'layerporter-agent:memory:v1' --namespace-id "$KV_ID" --remote --text >/tmp/lp-memory.json
 node --input-type=module <<'NODE'
import fs from 'node:fs';
import { evaluateLiveSafety } from './packages/layerporter-agent/src/live-safety-gate.js';
import { createAgentConfig } from './packages/layerporter-agent/src/config.js';
const c=JSON.parse(fs.readFileSync('packages/layerporter-agent/pilot-control.json','utf8'));const m=JSON.parse(fs.readFileSync('/tmp/lp-memory.json','utf8'));const now=new Date();
const config=createAgentConfig({LAYERPORTER_AGENT_WRITE_MODE:'live',LAYERPORTER_AGENT_LIVE_ACTIVATED_AT:c.activatedAt,LAYERPORTER_AGENT_LIVE_HARD_STOP_AT:c.hardStopAt,LAYERPORTER_AGENT_MAX_RESEARCH_PER_RUN:String(c.maxResearchPerRun),LAYERPORTER_AGENT_MAX_WRITES_PER_RUN:String(c.maxWritesPerRun),LAYERPORTER_AGENT_MAX_DAILY_WRITES:String(c.maxDailyWrites),LAYERPORTER_AGENT_MIN_LIVE_OPPORTUNITY_SCORE:String(c.minimumOpportunityScore),LAYERPORTER_AGENT_MIN_LIVE_EVIDENCE_SCORE:String(c.minimumEvidenceScore),LAYERPORTER_AGENT_ENABLE_THREAD_CREATION:String(c.enableThreadCreation)},now);
const s=evaluateLiveSafety(m,config,now);if(s.allowed!==false||s.reason!=='live_circuit_breaker_runtime_error') throw new Error(`not runtime-error breaker:${s.reason}`);console.log('LP097 CIRCUIT BREAKER RUNTIME ERROR CONFIRMED');
NODE
fi
echo "CLOUDFLARE CI PASS"
