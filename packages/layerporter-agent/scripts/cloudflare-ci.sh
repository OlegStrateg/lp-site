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
  node - <<'NODE'
const fs=require('fs');const ctl=JSON.parse(fs.readFileSync('packages/layerporter-agent/pilot-control.json','utf8'));const hb=JSON.parse(fs.readFileSync('/tmp/lp-heartbeat.json','utf8'));const a=Date.parse(ctl.activatedAt),s=Date.parse(hb.startedAt);if(!Number.isFinite(s)||s<a) throw new Error('not post activation');if(Date.now()-s>90*60*1000) throw new Error('stale');if(hb.ok!==true) throw new Error('ok false');if(hb.writeMode!=='live') throw new Error(`not live:${hb.writeMode}`);if(!hb.result||typeof hb.result!=='object') throw new Error('missing result');if((hb.result.writesThisRun??0)>1) throw new Error('writes bound exceeded');console.log('LP097 CORE LIVE HEARTBEAT PASS');
NODE
fi
echo "CLOUDFLARE CI PASS"
