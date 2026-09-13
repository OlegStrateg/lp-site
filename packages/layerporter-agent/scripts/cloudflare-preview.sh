#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
WRANGLER=(npx --yes wrangler@4.131.1)

# Diagnostic-only. No deploy and no mutation.
KV_LIST="$(${WRANGLER[@]} kv namespace list)"
printf '%s' "$KV_LIST" | node -e '
  const fs=require("fs");
  const rows=JSON.parse(fs.readFileSync(0,"utf8"));
  const x=rows.find((r)=>r.title==="layerporter-agent-state");
  if(!x?.id) process.exit(1);
'

echo 'LP-097 DIAG PASS: production agent KV namespace is visible from preview.'
