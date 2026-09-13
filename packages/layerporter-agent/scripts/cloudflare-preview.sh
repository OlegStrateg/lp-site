#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
WRANGLER=(npx --yes wrangler@4.131.1)

# Diagnostic-only: prove remote KV can be resolved/read. No deploy and no mutation.
KV_LIST="$(${WRANGLER[@]} kv namespace list)"
KV_ID="$(printf '%s' "$KV_LIST" | node -e '
  const fs=require("fs");
  const rows=JSON.parse(fs.readFileSync(0,"utf8"));
  const x=rows.find((r)=>r.title==="layerporter-agent-state");
  if(!x?.id) process.exit(2);
  process.stdout.write(String(x.id));
')"
test -n "$KV_ID" || exit 1

${WRANGLER[@]} kv key get 'layerporter-agent:heartbeat:v1' --namespace-id "$KV_ID" --remote --text > /tmp/lp-agent-heartbeat.json
node - <<'NODE'
const fs=require('fs');
const x=JSON.parse(fs.readFileSync('/tmp/lp-agent-heartbeat.json','utf8'));
if (!x || typeof x !== 'object' || !x.startedAt) process.exit(1);
NODE
rm -f /tmp/lp-agent-heartbeat.json

echo 'LP-097 DIAG PASS: remote KV heartbeat is readable and valid JSON.'
