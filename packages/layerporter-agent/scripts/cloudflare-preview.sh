#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

# Diagnostic-only. No deploy, no KV access, no mutation.
npx --yes wrangler@4.131.1 whoami --json > /tmp/lp-whoami.json
node - <<'NODE'
const fs=require('fs');
const x=JSON.parse(fs.readFileSync('/tmp/lp-whoami.json','utf8'));
if (x.loggedIn !== true || !Array.isArray(x.accounts) || x.accounts.length < 1) process.exit(1);
NODE
rm -f /tmp/lp-whoami.json

echo 'LP-097 DIAG PASS: Cloudflare auth is available inside non-production preview.'
