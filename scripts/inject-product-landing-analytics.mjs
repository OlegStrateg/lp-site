import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');
const MARKER = '<!-- lp-product-analytics:v1 -->';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function existingFile(candidates) {
  const found = candidates.find((file) => fs.existsSync(file));
  if (!found) throw new Error(`Product analytics entry not built: ${candidates.join(', ')}`);
  return found;
}

function inject(file, scriptBlock) {
  if (!fs.existsSync(file)) throw new Error(`Product landing missing: ${file}`);
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes(MARKER)) {
    if (!html.includes('</body>')) throw new Error(`No </body> in product landing: ${file}`);
    html = html.replace('</body>', `${MARKER}\n${scriptBlock}\n</body>`);
    fs.writeFileSync(file, html);
  }
  if (!html.includes(MARKER)) throw new Error(`Analytics marker missing after injection: ${file}`);
}

const entryFile = existingFile([
  path.join(DIST, '__product-analytics-entry', 'index.html'),
  path.join(DIST, '__product-analytics-entry.html'),
]);
const entryHtml = fs.readFileSync(entryFile, 'utf8');
const scripts = entryHtml.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
if (!scripts.length) throw new Error('Shared product analytics entry produced no client script');
const scriptBlock = scripts.join('\n');

const pictureRows = readJson(path.join(DIST, 'picture-converter-locales.json'));
const pinterestRows = readJson(path.join(DIST, 'pinterest-locales.json'));
if (pictureRows.length !== 49) throw new Error(`Expected 49 Picture Converter locales, got ${pictureRows.length}`);
if (pinterestRows.length !== 52) throw new Error(`Expected 52 Pinterest locales, got ${pinterestRows.length}`);

const targets = [];
for (const row of pictureRows) {
  const route = String(row.path || '/picture-converter/').replace(/^\/+|\/+$/g, '');
  targets.push(path.join(DIST, route, 'index.html'));
}
for (const row of pinterestRows) {
  if (!row.file) throw new Error(`Pinterest manifest missing file for ${row.code}`);
  targets.push(path.join(DIST, row.file));
}

for (const file of targets) inject(file, scriptBlock);

for (const file of targets) {
  const html = fs.readFileSync(file, 'utf8');
  if ((html.match(/lp-product-analytics:v1/g) || []).length !== 1) {
    throw new Error(`Product analytics marker count is not 1: ${file}`);
  }
  for (const script of scripts) {
    if (!html.includes(script)) throw new Error(`Shared analytics script missing from ${file}`);
  }
}

// The build-only entry is never a public route. Its compiled asset remains referenced
// by the injected product pages; only the temporary HTML entry point is removed.
if (entryFile.endsWith(`${path.sep}index.html`)) {
  fs.rmSync(path.dirname(entryFile), { recursive: true, force: true });
} else {
  fs.rmSync(entryFile, { force: true });
}

console.log(`Product landing analytics PASS: ${targets.length}/101 pages`);
