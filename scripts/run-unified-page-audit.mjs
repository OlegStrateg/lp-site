#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { extractPageFacts } from '../packages/page-audit-core/src/html-facts.js';
import { auditPageFacts } from '../packages/page-audit-core/src/audit.js';

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const htmlPath = arg('--html', 'dist/convert/webp-to-jpg/index.html');
const pageUrl = arg('--url', 'https://layerporter.com/convert/webp-to-jpg/');
const outPath = arg('--out', '_artifacts/unified-page-audit/webp-to-jpg-static.json');
const status = Number(arg('--status', '200'));

const html = await fs.readFile(htmlPath, 'utf8');
const facts = extractPageFacts({ url: pageUrl, html, status });
const report = auditPageFacts(facts);

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: 'PASS',
  htmlPath,
  pageUrl,
  outPath,
  findingCount: report.summary.findingCount,
  byDirection: report.summary.byDirection,
  coverage: Object.fromEntries(Object.entries(report.coverage).map(([key, value]) => [key, value.state])),
  topFindingIds: report.topFindings.map((finding) => finding.id),
}, null, 2));
