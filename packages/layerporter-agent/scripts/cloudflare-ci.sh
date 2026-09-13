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
const fs=require('fs'); const c=JSON.parse(fs.readFileSync('packages/layerporter-agent/pilot-control.json','utf8'));
if(c.id!=='LP-097'||c.authorizedBy!=='owner'||c.enabled!==true) throw new Error('pilot control inactive');
if(c.maxWritesPerRun!==1||c.maxDailyWrites>2||c.enableThreadCreation!==false) throw new Error('pilot bounds invalid');
NODE
if [ "${WORKERS_CI_BRANCH:-}" = 'diag/LP-097-live-heartbeat-1600' ]; then
  W=(npx --yes wrangler@4.131.1)
  ${W[@]} kv namespace list >/tmp/lp-kv-list.json
  KV_ID="$(node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("/tmp/lp-kv-list.json","utf8"));const x=r.find(v=>v.title==="layerporter-agent-state");if(!x?.id)process.exit(2);process.stdout.write(x.id)')"
  ${W[@]} kv key get 'layerporter-agent:heartbeat:v1' --namespace-id "$KV_ID" --remote --text >/tmp/lp-heartbeat.json
  ${W[@]} kv key get 'layerporter-agent:memory:v1' --namespace-id "$KV_ID" --remote --text >/tmp/lp-memory.json
  node --input-type=module <<'NODE'
import fs from 'node:fs';
import { evaluateHeartbeat } from './packages/layerporter-agent/src/heartbeat-gate.js';
import { evaluateLiveSafety } from './packages/layerporter-agent/src/live-safety-gate.js';
import { createAgentConfig } from './packages/layerporter-agent/src/config.js';
const control=JSON.parse(fs.readFileSync('packages/layerporter-agent/pilot-control.json','utf8'));
const heartbeat=JSON.parse(fs.readFileSync('/tmp/lp-heartbeat.json','utf8'));
const memory=JSON.parse(fs.readFileSync('/tmp/lp-memory.json','utf8'));
const activatedMs=Date.parse(control.activatedAt||''), startedMs=Date.parse(heartbeat.startedAt||''), finishedMs=Date.parse(heartbeat.finishedAt||'');
const now=new Date();
if(!Number.isFinite(activatedMs)||!Number.isFinite(startedMs)||!Number.isFinite(finishedMs)) throw new Error('invalid timestamps');
if(startedMs<activatedMs) throw new Error('heartbeat predates live activation');
if(now.getTime()-startedMs>90*60*1000) throw new Error('heartbeat stale >90m');
if(heartbeat.ok!==true) throw new Error(`heartbeat ok=false:${heartbeat.error?.code||heartbeat.error?.message||'unknown'}`);
if(heartbeat.writeMode!=='live') throw new Error(`writeMode=${heartbeat.writeMode}`);
if(!heartbeat.result||typeof heartbeat.result!=='object') throw new Error('missing result');
const writes=heartbeat.result.writesThisRun??0;
if(writes>Number(control.maxWritesPerRun)) throw new Error(`writesThisRun=${writes} exceeds bound`);
if(writes>0) throw new Error('LIVE_WRITE_OCCURRED_REQUIRES_POSTINGBOARD_READBACK');
const hb=evaluateHeartbeat(heartbeat,activatedMs,{expectedWriteMode:'live',maxWrites:Number(control.maxWritesPerRun)});
if(hb.code!==0) throw new Error(`heartbeat gate failed:${hb.status}`);
const config=createAgentConfig({
LAYERPORTER_AGENT_WRITE_MODE:'live',LAYERPORTER_AGENT_LIVE_ACTIVATED_AT:control.activatedAt,LAYERPORTER_AGENT_LIVE_HARD_STOP_AT:control.hardStopAt,
LAYERPORTER_AGENT_MAX_RESEARCH_PER_RUN:String(control.maxResearchPerRun),LAYERPORTER_AGENT_MAX_WRITES_PER_RUN:String(control.maxWritesPerRun),LAYERPORTER_AGENT_MAX_DAILY_WRITES:String(control.maxDailyWrites),
LAYERPORTER_AGENT_MIN_LIVE_OPPORTUNITY_SCORE:String(control.minimumOpportunityScore),LAYERPORTER_AGENT_MIN_LIVE_EVIDENCE_SCORE:String(control.minimumEvidenceScore),LAYERPORTER_AGENT_ENABLE_THREAD_CREATION:String(control.enableThreadCreation)},now);
const safety=evaluateLiveSafety(memory,config,now); if(!safety.allowed) throw new Error(`circuit breaker closed:${safety.reason}`);
const serialized=JSON.stringify(memory);
if(/published_unverified/i.test(serialized)||/"status"\s*:\s*"uncertain"/i.test(serialized)||/"status"\s*:\s*"failed"/i.test(serialized)) throw new Error('unsafe publication state in memory');
console.log(`LP097 LIVE RUNTIME VERIFIED startedAt=${heartbeat.startedAt} finishedAt=${heartbeat.finishedAt} writesThisRun=${writes} candidates=${heartbeat.result.candidates??'n/a'} researched=${heartbeat.result.researched??'n/a'}`);
NODE
fi
echo "CLOUDFLARE CI PASS"
