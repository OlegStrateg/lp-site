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
  npx --yes wrangler@4.131.1 kv namespace list >/tmp/lp-kv-list.json
  node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("/tmp/lp-kv-list.json","utf8"));if(!r.find(v=>v.title==="layerporter-agent-state")) process.exit(2);console.log("LP097 REMOTE KV AUTH PASS")'
fi
echo "CLOUDFLARE CI PASS"
