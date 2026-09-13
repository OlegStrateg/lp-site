#!/usr/bin/env bash
set -euo pipefail

# LP-097 private-state diagnostic via Cloudflare preview build.
# Read-only: does not deploy, schedule, write KV, or touch the production Worker.
WRANGLER=(npx --yes wrangler@4.131.1)
HEARTBEAT_KEY='layerporter-agent:heartbeat:v1'

KV_LIST="$(${WRANGLER[@]} kv namespace list)"
KV_ID="$(printf '%s' "$KV_LIST" | node -e '
  const fs=require("fs");
  const rows=JSON.parse(fs.readFileSync(0,"utf8"));
  const x=rows.find((r)=>r.title==="layerporter-agent-state");
  if(!x?.id) process.exit(2);
  process.stdout.write(String(x.id));
')"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
${WRANGLER[@]} kv key get "$HEARTBEAT_KEY" --namespace-id "$KV_ID" --text --remote > "$tmp"

node - "$tmp" <<'NODE'
const fs=require('fs');
const heartbeat=JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!heartbeat || typeof heartbeat !== 'object') process.exit(10);
if (!heartbeat.startedAt || !heartbeat.writeMode || typeof heartbeat.ok !== 'boolean') process.exit(11);
process.exit(0);
NODE

echo 'LP-097 DIAGNOSTIC BIT 0 PASS: preview token can read a valid remote heartbeat'
