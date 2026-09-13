#!/usr/bin/env bash
set -euo pipefail

# LP-097 private-state diagnostic via Cloudflare preview build.
# Read-only: does not deploy, schedule, write KV, or touch the production Worker.
WRANGLER=(npx --yes wrangler@4.131.1)
KV_TITLE='layerporter-agent-state'
HEARTBEAT_KEY='layerporter-agent:heartbeat:v1'
CUTOFF_MS="$(node -e 'process.stdout.write(String(Date.parse("2026-09-13T10:27:00Z")))')"

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

node - "$tmp" "$CUTOFF_MS" <<'NODE'
const fs=require('fs');
const heartbeat=JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const cutoff=Number(process.argv[3]);
const started=Date.parse(heartbeat.startedAt || '');
if (!Number.isFinite(started) || started < cutoff) process.exit(10);
if (heartbeat.writeMode !== 'live') process.exit(11);
// First diagnostic bit: prove that the failed Phase B produced a fresh live heartbeat.
process.exit(0);
NODE

echo 'LP-097 DIAGNOSTIC BIT 1 PASS: fresh live heartbeat exists'
