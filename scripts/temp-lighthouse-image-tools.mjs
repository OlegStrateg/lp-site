import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const url = 'https://layerporter.com/tools/crop-image/?perf=36013eb0';
const modes = [
  ['mobile', []],
  ['desktop', ['--preset=desktop']],
];

for (const [mode, extra] of modes) {
  const out = `/tmp/lighthouse-${mode}.json`;
  const args = [
    '--yes',
    'lighthouse@12.8.2',
    url,
    '--only-categories=performance',
    '--output=json',
    `--output-path=${out}`,
    '--chrome-flags=--headless --no-sandbox --disable-gpu',
    ...extra,
  ];
  const run = spawnSync('npx', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (run.status !== 0) {
    console.error(run.stdout);
    console.error(run.stderr);
    process.exit(run.status || 1);
  }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  const a = report.audits;
  const summary = {
    mode,
    score: Math.round((report.categories.performance.score || 0) * 100),
    FCP_ms: Math.round(a['first-contentful-paint'].numericValue || 0),
    LCP_ms: Math.round(a['largest-contentful-paint'].numericValue || 0),
    TBT_ms: Math.round(a['total-blocking-time'].numericValue || 0),
    CLS: Number((a['cumulative-layout-shift'].numericValue || 0).toFixed(3)),
    SpeedIndex_ms: Math.round(a['speed-index'].numericValue || 0),
    TTI_ms: Math.round(a['interactive']?.numericValue || 0),
    transfer_bytes: Math.round(a['total-byte-weight']?.numericValue || 0),
    main_thread_ms: Math.round(a['mainthread-work-breakdown']?.numericValue || 0),
  };
  console.log('LIGHTHOUSE_RESULT '+JSON.stringify(summary));
}
