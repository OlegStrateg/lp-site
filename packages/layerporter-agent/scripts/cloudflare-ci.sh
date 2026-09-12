#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

echo "LayerPorter Agent Cloudflare CI"
echo "branch=${WORKERS_CI_BRANCH:-local} commit=${WORKERS_CI_COMMIT_SHA:-unknown}"

node --test packages/layerporter-agent/tests/*.test.js

while IFS= read -r file; do
  node --check "$file" >/dev/null
done < <(find packages/layerporter-agent/src -type f -name '*.js' | sort)

node - <<'NODE'
const fs = require('fs');
const path = 'packages/layerporter-agent/pilot-control.json';
if (!fs.existsSync(path)) process.exit(0);
const c = JSON.parse(fs.readFileSync(path, 'utf8'));
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
NODE

echo "CLOUDFLARE CI PASS"
