#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

WRANGLER=(npx --yes wrangler@4.131.1)
TEMPLATE='wrangler-layerporter-agent.toml.example'
CONTROL='packages/layerporter-agent/pilot-control.json'
KV_TITLE='layerporter-agent-state'
HEARTBEAT_KEY='layerporter-agent:heartbeat:v1'

if [ "${WORKERS_CI_BRANCH:-master}" != 'master' ]; then
  echo "Non-production branch ${WORKERS_CI_BRANCH:-unknown}: deployment intentionally skipped"
  exit 0
fi

test -f "$TEMPLATE" || { echo "Missing $TEMPLATE"; exit 1; }

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
MAX_RESEARCH='3'
MAX_WRITES_RUN='2'
MAX_WRITES_DAY='6'
MIN_OPPORTUNITY='0.72'
MIN_EVIDENCE='0.82'
HARD_STOP=''

if [ -f "$CONTROL" ]; then
  CONTROL_VALUES="$(node - "$CONTROL" <<'NODE'
const fs=require('fs');
const c=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if (c.id !== 'LP-097') throw new Error('Unexpected pilot id');
if (c.authorizedBy !== 'owner') throw new Error('Live pilot must be owner-authorized');
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
  c.maxResearchPerRun,
  c.maxWritesPerRun,
  c.maxDailyWrites,
  c.minimumOpportunityScore,
  c.minimumEvidenceScore,
  c.hardStopAt,
].join('\t'));
NODE
)"
  IFS=$'\t' read -r CONTROL_ENABLED CONTROL_RESEARCH CONTROL_WRITES_RUN CONTROL_WRITES_DAY CONTROL_MIN_OPPORTUNITY CONTROL_MIN_EVIDENCE CONTROL_HARD_STOP <<< "$CONTROL_VALUES"
  if [ "$CONTROL_ENABLED" = 'true' ]; then
    NOW_MS="$(node -e 'process.stdout.write(String(Date.now()))')"
    STOP_MS="$(node -e 'process.stdout.write(String(Date.parse(process.argv[1])))' "$CONTROL_HARD_STOP")"
    if [ "$NOW_MS" -lt "$STOP_MS" ]; then
      MODE='live'
      MAX_RESEARCH="$CONTROL_RESEARCH"
      MAX_WRITES_RUN="$CONTROL_WRITES_RUN"
      MAX_WRITES_DAY="$CONTROL_WRITES_DAY"
      MIN_OPPORTUNITY="$CONTROL_MIN_OPPORTUNITY"
      MIN_EVIDENCE="$CONTROL_MIN_EVIDENCE"
      HARD_STOP="$CONTROL_HARD_STOP"
    else
      echo 'Owner live authorization expired; deploying dry-run'
    fi
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
    printf 'LAYERPORTER_AGENT_LIVE_HARD_STOP_AT = "%s"\n' "$HARD_STOP" >> "$outfile"
  fi
}

make_unscheduled_config() {
  local outfile="$1"
  make_config '0 * * * *' "$outfile"
  sed -i '/^\[triggers\]$/,+1c\[triggers]\ncrons = []' "$outfile"
}

PREFIX=".wrangler-layerporter-agent-build-${WORKERS_CI_BUILD_UUID:-$$}"
UNSCHEDULED="${PREFIX}-unscheduled.toml"
MINUTE="${PREFIX}-minute.toml"
HOURLY="${PREFIX}-hourly.toml"
FALLBACK="${PREFIX}-fallback.toml"
HEARTBEAT="/tmp/layerporter-agent-heartbeat-${WORKERS_CI_BUILD_UUID:-$$}.json"
trap 'rm -f "$UNSCHEDULED" "$MINUTE" "$HOURLY" "$FALLBACK" "$HEARTBEAT"' EXIT

make_unscheduled_config "$UNSCHEDULED"
make_config '* * * * *' "$MINUTE"
make_config '0 * * * *' "$HOURLY"

# Fail closed first: configs live at repo root so relative `main` resolves correctly.
${WRANGLER[@]} deploy --config "$UNSCHEDULED"
echo "Worker deployed unscheduled in mode=$MODE"

GATE_MS="$(node -e 'process.stdout.write(String(Date.now()))')"
${WRANGLER[@]} deploy --config "$MINUTE"
echo "Temporary one-minute verification trigger deployed in mode=$MODE"

verified=0
failure='no_fresh_heartbeat'
if [ "$MODE" = 'live' ]; then GATE_MAX_WRITES="$MAX_WRITES_RUN"; else GATE_MAX_WRITES='0'; fi

for attempt in $(seq 1 90); do
  set +e
  ${WRANGLER[@]} kv key get "$HEARTBEAT_KEY" --namespace-id "$KV_ID" --text --remote > "$HEARTBEAT" 2>/dev/null
  kv_status=$?
  set -e
  if [ "$kv_status" -eq 0 ] && [ -s "$HEARTBEAT" ]; then
    set +e
    node packages/layerporter-agent/src/heartbeat-gate.js "$HEARTBEAT" "$GATE_MS" "$MODE" "$GATE_MAX_WRITES"
    gate_status=$?
    set -e
    if [ "$gate_status" -eq 0 ]; then
      verified=1
      break
    fi
    if [ "$gate_status" -eq 2 ]; then
      failure='fresh_runtime_error_or_unsafe_state'
      break
    fi
  fi
  if [ $((attempt % 12)) -eq 0 ]; then
    echo "Waiting for fresh $MODE heartbeat ($attempt/90)"
  fi
  sleep 10
done

if [ "$verified" -eq 1 ]; then
  ${WRANGLER[@]} deploy --config "$HOURLY"
  echo "CLOUDFLARE RUNTIME PASS: mode=$MODE; hourly trigger deployed"
  exit 0
fi

# Any ambiguity returns the Worker to unscheduled dry-run.
MODE='dry-run'
MAX_RESEARCH='3'
MAX_WRITES_RUN='2'
MAX_WRITES_DAY='6'
HARD_STOP=''
make_unscheduled_config "$FALLBACK"
${WRANGLER[@]} deploy --config "$FALLBACK"
echo "CLOUDFLARE RUNTIME FAIL-CLOSED: $failure; Worker returned to unscheduled dry-run"
exit 1
