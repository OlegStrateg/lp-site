#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

echo "LayerPorter Agent Cloudflare CI"
echo "branch=${WORKERS_CI_BRANCH:-local} commit=${WORKERS_CI_COMMIT_SHA:-unknown}"

changed_paths() {
  if [ -z "${WORKERS_CI_COMMIT_SHA:-}" ]; then
    return 0
  fi
  git show --pretty=format: --name-only --no-renames "$WORKERS_CI_COMMIT_SHA" 2>/dev/null \
    | sed '/^[[:space:]]*$/d' \
    | sort -u || true
}

classify_change() {
  node --input-type=module -e '
    import fs from "node:fs";
    import { classifyBuildChange } from "./packages/layerporter-agent/src/build-change-policy.js";
    const paths = fs.readFileSync(0, "utf8").split(/\r?\n/).filter(Boolean);
    process.stdout.write(classifyBuildChange(paths));
  '
}

CHANGED_PATHS="$(changed_paths)"
CHANGE_MODE="$(printf '%s\n' "$CHANGED_PATHS" | classify_change)"
echo "change_mode=$CHANGE_MODE"

if [ "${WORKERS_CI_BRANCH:-}" = 'master' ] && [ "$CHANGE_MODE" = 'unrelated' ]; then
  echo 'CLOUDFLARE CI PASS: unrelated monorepo change; LayerPorter Agent validation/deploy not required.'
  exit 0
fi

bash -n packages/layerporter-agent/scripts/cloudflare-ci.sh
bash -n packages/layerporter-agent/scripts/cloudflare-deploy.sh
bash -n packages/layerporter-agent/scripts/cloudflare-preview.sh

node --test packages/layerporter-agent/tests/*.test.js

while IFS= read -r file; do
  node --check "$file" >/dev/null
done < <(find packages/layerporter-agent/src -type f -name '*.js' | sort)

CONTROL='packages/layerporter-agent/pilot-control.json'
AUDIT_REQUEST='packages/layerporter-agent/runtime-audit-request.json'

node - "$CONTROL" "$AUDIT_REQUEST" <<'NODE'
const fs = require('fs');
const [controlPath, auditPath] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync(controlPath, 'utf8'));
const a = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
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

if (a.id !== 'LP-097') throw new Error('Unexpected runtime audit id');
if (a.requestedBy !== 'owner') throw new Error('Runtime audit must be owner-requested');
if (typeof a.enabled !== 'boolean') throw new Error('Runtime audit enabled must be boolean');
if (a.expectedWriteMode !== 'live') throw new Error('Runtime audit expectedWriteMode must be live');
if (a.maxWritesPerRun !== 1) throw new Error('Runtime audit maxWritesPerRun must equal 1');
const auditGate = Date.parse(a.minimumHeartbeatAt);
if (!Number.isFinite(auditGate)) throw new Error('Invalid runtime audit minimumHeartbeatAt');
if (!Number.isInteger(a.maxHeartbeatAgeMinutes) || a.maxHeartbeatAgeMinutes < 1 || a.maxHeartbeatAgeMinutes > 180) throw new Error('Invalid runtime audit age bound');
NODE

AUDIT_ENABLED="$(node -e 'const fs=require("fs"); const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(x.enabled===true?"true":"false")' "$AUDIT_REQUEST")"

if [ "${WORKERS_CI_BRANCH:-}" = 'master' ] && [ "$AUDIT_ENABLED" = 'true' ]; then
  echo 'LP-097 production runtime audit requested (read-only).'
  WRANGLER=(npx --yes wrangler@4.131.1)
  KV_LIST="$(${WRANGLER[@]} kv namespace list)"
  KV_ID="$(printf '%s' "$KV_LIST" | node -e '
    const fs=require("fs");
    const rows=JSON.parse(fs.readFileSync(0,"utf8"));
    const x=rows.find((r)=>r.title==="layerporter-agent-state");
    if(!x?.id) process.exit(2);
    process.stdout.write(String(x.id));
  ')"
  test -n "$KV_ID" || { echo 'Dedicated LayerPorter Agent KV not found'; exit 1; }

  HEARTBEAT_FILE="$(mktemp)"
  MEMORY_FILE="$(mktemp)"
  trap 'rm -f "$HEARTBEAT_FILE" "$MEMORY_FILE"' EXIT
  chmod 600 "$HEARTBEAT_FILE" "$MEMORY_FILE"
  ${WRANGLER[@]} kv key get 'layerporter-agent:heartbeat:v1' --namespace-id "$KV_ID" --remote --text > "$HEARTBEAT_FILE"
  ${WRANGLER[@]} kv key get 'layerporter-agent:memory:v1' --namespace-id "$KV_ID" --remote --text > "$MEMORY_FILE"

  node packages/layerporter-agent/src/runtime-audit.js \
    "$HEARTBEAT_FILE" \
    "$MEMORY_FILE" \
    "$CONTROL" \
    "$AUDIT_REQUEST"
  echo 'LP-097 PRODUCTION RUNTIME AUDIT PASS: heartbeat, live circuit breaker and publication read-back are within owner bounds.'
fi

echo "CLOUDFLARE CI PASS"
