#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

# Diagnostic-only. Read production Worker version metadata; no deploy/mutation.
npx --yes wrangler@4.131.1 versions view b96b0486-9f0f-4351-9e9c-812a069e141f --name layerporter-agent --json > /tmp/lp-version.json
node - <<'NODE'
const fs=require('fs');
const x=JSON.parse(fs.readFileSync('/tmp/lp-version.json','utf8'));
if (!x || typeof x !== 'object') process.exit(1);
NODE
rm -f /tmp/lp-version.json

echo 'LP-097 DIAG PASS: active production Worker version metadata is readable.'
