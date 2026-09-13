#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

CONTROL='packages/layerporter-agent/pilot-control.json'
DEPLOY='packages/layerporter-agent/scripts/cloudflare-deploy.sh'

test -f "$CONTROL" || { echo "Missing $CONTROL"; exit 1; }
test -f "$DEPLOY" || { echo "Missing $DEPLOY"; exit 1; }

bash -n "$DEPLOY"
npm --prefix packages/layerporter-agent run check
npm --prefix packages/layerporter-agent test

node - "$CONTROL" <<'NODE'
const fs = require('fs');
const c = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (c.id !== 'LP-097') throw new Error('Unexpected pilot id');
if (c.authorizedBy !== 'owner') throw new Error('Pilot must remain owner-authorized');
if (typeof c.enabled !== 'boolean') throw new Error('enabled must be boolean');
const start = Date.parse(c.activatedAt);
const stop = Date.parse(c.hardStopAt);
if (!Number.isFinite(start) || !Number.isFinite(stop) || stop <= start) throw new Error('Invalid pilot timestamps');
if (stop - start > 15 * 24 * 60 * 60 * 1000) throw new Error('Pilot hard stop exceeds 15 days');
if (c.maxWritesPerRun !== 1) throw new Error('maxWritesPerRun must equal 1');
if (c.maxDailyWrites > 2) throw new Error('maxDailyWrites exceeds owner-approved bound');
if (c.enableThreadCreation !== false) throw new Error('Thread creation must stay disabled');
NODE

echo 'LayerPorter Agent preview validation PASS: syntax, tests and pilot bounds verified; production deployment skipped.'
