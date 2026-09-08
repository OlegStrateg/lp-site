import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');
const MARKER = '<!-- lp-extensions-analytics:v1 -->';
const LOCALES = ['ru', 'de', 'es', 'fr', 'pt-br', 'ja', 'zh-cn'];

function existingFile(candidates) {
  const found = candidates.find((file) => fs.existsSync(file));
  if (!found) throw new Error(`Extensions analytics entry not built: ${candidates.join(', ')}`);
  return found;
}

function inject(file, scriptBlock) {
  if (!fs.existsSync(file)) throw new Error(`Extensions Hub missing: ${file}`);
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes(MARKER)) throw new Error(`Extensions analytics marker already exists before injection: ${file}`);
  if (!html.includes('</body>')) throw new Error(`No </body> in Extensions Hub: ${file}`);
  html = html.replace('</body>', `${MARKER}\n${scriptBlock}\n</body>`);
  fs.writeFileSync(file, html);
}

const entryFile = existingFile([
  path.join(DIST, 'internal-extensions-analytics-entry', 'index.html'),
  path.join(DIST, 'internal-extensions-analytics-entry.html'),
]);
const entryHtml = fs.readFileSync(entryFile, 'utf8');
const scripts = entryHtml.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
if (!scripts.length) throw new Error('Shared Extensions Hub analytics entry produced no client script');
const scriptBlock = scripts.join('\n');

for (const required of [
  'nmpahchhmcdejmfcmkphnbhckmlhhnon',
  'oegpbmdpckfdgodnkdnoggedamfflfcl',
  'extension_store_click',
  'extensions_hub',
]) {
  if (!scriptBlock.includes(required)) throw new Error(`Extensions analytics bundle lost required marker: ${required}`);
}

const targets = [
  path.join(DIST, 'extensions', 'index.html'),
  ...LOCALES.map((locale) => path.join(DIST, locale, 'extensions', 'index.html')),
];
for (const file of targets) inject(file, scriptBlock);

for (const file of targets) {
  const html = fs.readFileSync(file, 'utf8');
  if ((html.match(/lp-extensions-analytics:v1/g) || []).length !== 1) {
    throw new Error(`Extensions analytics marker count is not 1: ${file}`);
  }
  for (const script of scripts) {
    if (!html.includes(script)) throw new Error(`Shared Extensions analytics script missing from ${file}`);
  }
}

// EN already gets page_view from BaseLayout. The injected bundle itself explicitly
// emits page_view only for the seven standalone localized hubs.
if (!scriptBlock.includes('if (localizedHub)')) throw new Error('Localized-only page_view guard missing');
if (scriptBlock.includes("if (englishHub) track('page_view'")) throw new Error('EN page_view duplication guard regressed');

if (entryFile.endsWith(`${path.sep}index.html`)) {
  fs.rmSync(path.dirname(entryFile), { recursive: true, force: true });
} else {
  fs.rmSync(entryFile, { force: true });
}

const leftover = [
  path.join(DIST, 'internal-extensions-analytics-entry', 'index.html'),
  path.join(DIST, 'internal-extensions-analytics-entry.html'),
].find((file) => fs.existsSync(file));
if (leftover) throw new Error(`Internal Extensions analytics entry leaked into dist: ${leftover}`);

console.log(`Extensions Hub analytics PASS: ${targets.length}/8 pages`);
