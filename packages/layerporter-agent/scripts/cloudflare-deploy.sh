#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

WRANGLER=(npx --yes wrangler@4.131.1)
TEMPLATE='wrangler-layerporter-agent.toml.example'
CONTROL='packages/layerporter-agent/pilot-control.json'
KV_TITLE='layerporter-agent-state'

if [ "${WORKERS_CI_BRANCH:-master}" != 'master' ]; then
  echo "Non-production branch ${WORKERS_CI_BRANCH:-unknown}: deployment intentionally skipped"
  exit 0
fi

test -f "$TEMPLATE" || { echo "Missing $TEMPLATE"; exit 1; }
test -f "$CONTROL" || { echo "Missing $CONTROL"; exit 1; }

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
test -n "$KV_ID" || { echo "Dedicated KV namespace $KV_TITLE not found"; exit 1; }
echo "Dedicated LayerPorter Agent KV resolved"

MODE='dry-run'
ACTIVATED_AT=''
MAX_RESEARCH='3'
MAX_WRITES_RUN='2'
MAX_WRITES_DAY='6'
MIN_OPPORTUNITY='0.72'
MIN_EVIDENCE='0.82'
HARD_STOP=''

CONTROL_VALUES="$(node - "$CONTROL" <<'NODE'
const fs=require('fs');
const c=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if (c.id !== 'LP-097') throw new Error('Unexpected pilot id');
if (c.authorizedBy !== 'owner') throw new Error('Live pilot must be owner-authorized');
if (typeof c.enabled !== 'boolean') throw new Error('enabled must be boolean');
if (!Number.isInteger(c.maxResearchPerRun) || c.maxResearchPerRun < 1 || c.maxResearchPerRun > 2) throw new Error('Invalid maxResearchPerRun');
if (c.maxWritesPerRun !== 1) throw new Error('maxWritesPerRun must equal 1');
if (!Number.isInteger(c.maxDailyWrites) || c.maxDailyWrites < 1 || c.maxDailyWrites > 2) throw new Error('Invalid maxDailyWrites');
if (!(c.minimumOpportunityScore >= 0.72 && c.minimumOpportunityScore <= 1)) throw new Error('Invalid minimumOpportunityScore');
if (!(c.minimumEvidenceScore >= 0.82 && c.minimumEvidenceScore <= 1)) throw new Error('Invalid minimumEvidenceScore');
if (c.enableThreadCreation !== false) throw new Error('Thread creation must stay disabled');
const start=Date.parse(c.activatedAt); const stop=Date.parse(c.hardStopAt);
if (!Number.isFinite(start) || !Number.isFinite(stop) || stop <= start) throw new Error('Invalid pilot timestamps');
if (stop-start > 15*24*60*60*1000) throw new Error('Pilot hard stop exceeds 15 days');
process.stdout.write([
  c.enabled === true ? 'true' : 'false',
  c.activatedAt,
  c.maxResearchPerRun,
  c.maxWritesPerRun,
  c.maxDailyWrites,
  c.minimumOpportunityScore,
  c.minimumEvidenceScore,
  c.hardStopAt,
].join('\t'));
NODE
)"
IFS=$'\t' read -r CONTROL_ENABLED CONTROL_ACTIVATED CONTROL_RESEARCH CONTROL_WRITES_RUN CONTROL_WRITES_DAY CONTROL_MIN_OPPORTUNITY CONTROL_MIN_EVIDENCE CONTROL_HARD_STOP <<< "$CONTROL_VALUES"

if [ "$CONTROL_ENABLED" = 'true' ]; then
  NOW_MS="$(node -e 'process.stdout.write(String(Date.now()))')"
  START_MS="$(node -e 'process.stdout.write(String(Date.parse(process.argv[1])))' "$CONTROL_ACTIVATED")"
  STOP_MS="$(node -e 'process.stdout.write(String(Date.parse(process.argv[1])))' "$CONTROL_HARD_STOP")"
  if [ "$NOW_MS" -ge "$START_MS" ] && [ "$NOW_MS" -lt "$STOP_MS" ]; then
    MODE='live'
    ACTIVATED_AT="$CONTROL_ACTIVATED"
    MAX_RESEARCH="$CONTROL_RESEARCH"
    MAX_WRITES_RUN="$CONTROL_WRITES_RUN"
    MAX_WRITES_DAY="$CONTROL_WRITES_DAY"
    MIN_OPPORTUNITY="$CONTROL_MIN_OPPORTUNITY"
    MIN_EVIDENCE="$CONTROL_MIN_EVIDENCE"
    HARD_STOP="$CONTROL_HARD_STOP"
  elif [ "$NOW_MS" -lt "$START_MS" ]; then
    echo 'Owner live authorization is not active yet; deploying unscheduled dry-run'
  else
    echo 'Owner live authorization expired; deploying unscheduled dry-run'
  fi
fi

make_config() {
  local cron="$1"
  local outfile="$2"
  sed "s/REPLACE_WITH_DEDICATED_KV_NAMESPACE_ID/${KV_ID}/" "$TEMPLATE" \
    | sed "s/crons = \[\"0 \* \* \* \*\"\]/crons = [\"${cron}\"]/" \
    > "$outfile"

  if [ "$MODE" = 'live' ]; then
    sed -i 's/LAYERPORTER_AGENT_WRITE_MODE = "dry-run"/LAYERPORTER_AGENT_WRITE_MODE = "live"/' "$outfile"
    sed -i "s/LAYERPORTER_AGENT_MAX_RESEARCH_PER_RUN = \"3\"/LAYERPORTER_AGENT_MAX_RESEARCH_PER_RUN = \"${MAX_RESEARCH}\"/" "$outfile"
    sed -i "s/LAYERPORTER_AGENT_MAX_WRITES_PER_RUN = \"2\"/LAYERPORTER_AGENT_MAX_WRITES_PER_RUN = \"${MAX_WRITES_RUN}\"/" "$outfile"
    sed -i "s/LAYERPORTER_AGENT_MAX_DAILY_WRITES = \"6\"/LAYERPORTER_AGENT_MAX_DAILY_WRITES = \"${MAX_WRITES_DAY}\"/" "$outfile"
    printf '\nLAYERPORTER_AGENT_MIN_LIVE_OPPORTUNITY_SCORE = "%s"\n' "$MIN_OPPORTUNITY" >> "$outfile"
    printf 'LAYERPORTER_AGENT_MIN_LIVE_EVIDENCE_SCORE = "%s"\n' "$MIN_EVIDENCE" >> "$outfile"
    printf 'LAYERPORTER_AGENT_LIVE_ACTIVATED_AT = "%s"\n' "$ACTIVATED_AT" >> "$outfile"
    printf 'LAYERPORTER_AGENT_LIVE_HARD_STOP_AT = "%s"\n' "$HARD_STOP" >> "$outfile"
  fi
}

make_unscheduled_config() {
  local outfile="$1"
  make_config '0 * * * *' "$outfile"
  sed -i '/^\[triggers\]$/,+1c\[triggers]\ncrons = []' "$outfile"
}

PREFIX=".wrangler-layerporter-agent-build-${WORKERS_CI_BUILD_UUID:-$$}"
CONFIG="${PREFIX}.toml"
trap 'rm -f "$CONFIG"' EXIT

if [ "$MODE" = 'live' ]; then
  make_config '0 * * * *' "$CONFIG"
  ${WRANGLER[@]} deploy --config "$CONFIG"
  echo 'CLOUDFLARE DEPLOY PASS: bounded live mode deployed; hourly trigger requested.'
  echo 'Runtime safety is enforced inside the agent; Cron Trigger propagation is asynchronous.'
  exit 0
fi

make_unscheduled_config "$CONFIG"
${WRANGLER[@]} deploy --config "$CONFIG"
echo 'CLOUDFLARE DEPLOY PASS: unscheduled dry-run deployed.'
