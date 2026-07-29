// Uniqueness gate (ТЗ §7.2) — runs AFTER `astro build`, against dist output.
// Extracts visible text from every content page's index.html (converter
// pages under dist/convert/, plus wave-2 articles under dist/formats/ and
// dist/guides/ — hub/index pages themselves are excluded, they're
// navigation, not content), builds 5-word shingle sets, and FAILS the build
// if any pair overlaps by more than 40% (i.e. uniqueness < 60%). All pages
// are compared pairwise regardless of section — a templated article
// shouldn't slip through just because it's not technically a "converter".
//
// Overlap metric: containment = |A ∩ B| / min(|A|, |B|) — the stricter of the
// common choices (a small page fully contained in a big one scores 100%).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');
// [directory under dist/, label prefix for the page's identifier in output]
const SECTIONS = [
  ['convert', 'convert'],
  ['formats', 'formats'],
  ['guides', 'guides'],
];
const SHINGLE_SIZE = 5;
const MAX_OVERLAP = 0.40;

if (!existsSync(DIST_DIR)) {
  console.error(`uniqueness-check: ${DIST_DIR} not found — run astro build first`);
  process.exit(1);
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ') // includes JSON-LD
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#\d+;|&[a-z]+;/gi, ' ') // entities are not words
    .toLowerCase();
}

function shingles(text, size = SHINGLE_SIZE) {
  const words = text.match(/[a-z0-9]+/g) ?? [];
  const set = new Set();
  for (let i = 0; i + size <= words.length; i++) {
    set.add(words.slice(i, i + size).join(' '));
  }
  return set;
}

const pages = SECTIONS.flatMap(([dir, label]) => {
  const sectionDir = path.join(DIST_DIR, dir);
  if (!existsSync(sectionDir)) return [];
  return readdirSync(sectionDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const file = path.join(sectionDir, d.name, 'index.html');
      if (!existsSync(file)) return null;
      const sh = shingles(visibleText(readFileSync(file, 'utf8')));
      return { slug: `${label}/${d.name}`, shingles: sh };
    })
    .filter(Boolean);
});

console.log(`uniqueness-check: ${pages.length} content page(s) across ${SECTIONS.map(([d]) => `dist/${d}/`).join(', ')}`);
for (const p of pages) {
  console.log(`  ${p.slug}: ${p.shingles.size} shingles (${SHINGLE_SIZE}-word)`);
}

if (pages.length < 2) {
  console.log(`uniqueness-check: ${pages.length} page, nothing to compare — PASS`);
  process.exit(0);
}

let failed = false;
for (let i = 0; i < pages.length; i++) {
  for (let j = i + 1; j < pages.length; j++) {
    const a = pages[i], b = pages[j];
    let common = 0;
    const [small, big] = a.shingles.size <= b.shingles.size ? [a, b] : [b, a];
    for (const s of small.shingles) if (big.shingles.has(s)) common++;
    const denom = Math.min(a.shingles.size, b.shingles.size) || 1;
    const overlap = common / denom;
    const pct = (overlap * 100).toFixed(1);
    const verdict = overlap > MAX_OVERLAP ? 'FAIL' : 'ok';
    console.log(`  ${a.slug} <-> ${b.slug}: overlap ${pct}% (${common}/${denom} shingles) — ${verdict}`);
    if (overlap > MAX_OVERLAP) failed = true;
  }
}

if (failed) {
  console.error(`uniqueness-check: FAIL — at least one pair overlaps more than ${MAX_OVERLAP * 100}% (uniqueness < ${100 - MAX_OVERLAP * 100}%)`);
  process.exit(1);
}
console.log('uniqueness-check: PASS — all pairs within limit');
process.exit(0);
