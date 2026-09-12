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

if [ -f "$CONTROL" ] && [ "$(jq -r '.enabled // false' "$CONTROL")" = 'true' ]; then
  jq -e '
    .id == "LP-097" and
    .authorizedBy == "owner" and
    (.maxResearchPerRun | type == "number" and . >= 1 and . <= 2) and
    .maxWritesPerRun == 1 and
    (.maxDailyWrites | type == "number" and . >= 1 and . <= 2) and
    (.minimumOpportunityScore | type == "number" and . >= 0.72 and . <= 1) and
    (.minimumEvidenceScore | type == "number" and . >= 0.82 and . <= 1) and
    .enableThreadCreation == false
  ' "$CONTROL" >/dev/null
  HARD_STOP="$(jq -r '.hardStopAt' "$CONTROL")"
  NOW_EPOCH="$(date -u +%s)"
  STOP_EPOCH="$(date -u -d "$HARD_STOP" +%s)"
  if [ "$NOW_EPOCH" -lt "$STOP_EPOCH" ]; then
    MODE='live'
    MAX_RESEARCH="$(jq -r '.maxResearchPerRun' "$CONTROL")"
    MAX_WRITES_RUN="$(jq -r '.maxWritesPerRun' "$CONTROL")"
    MAX_WRITES_DAY="$(jq -r '.maxDailyWrites' "$CONTROL")"
    MIN_OPPORTUNITY="$(jq -r '.minimumOpportunityScore' "$CONTROL")"
    MIN_EVIDENCE="$(jq -r '.minimumEvidenceScore' "$CONTROL")"
  else
    echo 'Owner live authorization expired; deploying dry-run'
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

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
UNSCHEDULED="$TMP_DIR/unscheduled.toml"
MINUTE="$TMP_DIR/minute.toml"
HOURLY="$TMP_DIR/hourly.toml"
HEARTBEAT="$TMP_DIR/heartbeat.json"

make_unscheduled_config "$UNSCHEDULED"
make_config '* * * * *' "$MINUTE"
make_config '0 * * * *' "$HOURLY"

# Fail closed first: the new revision is deployed with no trigger.
${WRANGLER[@]} deploy --config "$UNSCHEDULED"
echo "Worker deployed unscheduled in mode=$MODE"

GATE_MS="$(node -e 'process.stdout.write(String(Date.now()))')"
${WRANGLER[@]} deploy --config "$MINUTE"
echo "Temporary one-minute verification trigger deployed in mode=$MODE"

verified=0
failure='no_fresh_heartbeat'
for attempt in $(seq 1 90); do
  set +e
  ${WRANGLER[@]} kv key get "$HEARTBEAT_KEY" --namespace-id "$KV_ID" --text --remote > "$HEARTBEAT" 2>/dev/null
  kv_status=$?
  set -e
  if [ "$kv_status" -eq 0 ] && [ -s "$HEARTBEAT" ]; then
    set +e
    node packages/layerporter-agent/src/heartbeat-gate.js "$HEARTBEAT" "$GATE_MS" "$MODE" "$([ "$MODE" = 'live' ] && printf '%s' "$MAX_WRITES_RUN" || printf '0')"
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
FALLBACK="$TMP_DIR/fallback.toml"
make_unscheduled_config "$FALLBACK"
${WRANGLER[@]} deploy --config "$FALLBACK"
echo "CLOUDFLARE RUNTIME FAIL-CLOSED: $failure; Worker returned to unscheduled dry-run"
exit 1
