import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(here, '..');
const repoRoot = path.resolve(packageDir, '../..');

const toolNames = [
  'analyze_page_images',
  'optimize_image',
  'generate_responsive_variants',
  'compare_image_versions',
  'optimize_page_images',
  'analyze_url_images',
  'optimize_url_images',
];

const read = (file) => readFile(file, 'utf8');
const readJson = async (file) => JSON.parse(await read(file));

const readme = await read(path.join(packageDir, 'README.md'));
const manifest = await readJson(path.join(packageDir, 'distribution/distribution-manifest.json'));
const ledger = await read(path.join(packageDir, 'distribution/distribution-proof-ledger.json'));
const productCopy = await read(path.join(repoRoot, 'src/copy/website-image-optimizer-mcp.md'));
const docsCopy = await read(path.join(repoRoot, 'src/copy/website-image-optimizer-mcp-docs.md'));

assert.equal(manifest.product.toolCount, 7);
for (const name of toolNames) assert.ok(readme.includes(`\`${name}\``), `README missing ${name}`);
assert.ok(manifest.canonicalCapabilities.some((item) => item.includes('public HTTP(S) page')));
assert.ok(manifest.safetyFacts.some((item) => item.includes('network access exists only in the two URL tools')));
assert.ok(productCopy.includes('analyze_url_images'));
assert.ok(productCopy.includes('optimize_url_images'));
assert.ok(docsCopy.includes('analyze_url_images'));
assert.ok(docsCopy.includes('optimize_url_images'));

const staleClaims = [
  'Five bounded MCP tools',
  'does not fetch remote URLs',
  'no remote URL fetch',
  'no network fetch in the MCP layer',
  'fiveToolsMatch',
  '"toolCount": 5',
];
for (const stale of staleClaims) {
  for (const [label, text] of [
    ['README', readme],
    ['distribution manifest', JSON.stringify(manifest)],
    ['distribution ledger', ledger],
    ['product copy', productCopy],
    ['docs copy', docsCopy],
  ]) {
    assert.equal(text.includes(stale), false, `${label} still contains stale claim: ${stale}`);
  }
}

assert.ok(readme.includes('HTTP(S) fetching'));
assert.ok(readme.includes('does not claim browser-rendered size'));
assert.ok(docsCopy.includes('does not claim rendered dimensions'));
assert.ok(docsCopy.includes('static-HTML fast mode'));

process.stdout.write(`${JSON.stringify({
  status: 'PASS',
  toolCount: manifest.product.toolCount,
  tools: toolNames,
  checked: [
    'packages/image-optimizer-mcp/README.md',
    'packages/image-optimizer-mcp/distribution/distribution-manifest.json',
    'packages/image-optimizer-mcp/distribution/distribution-proof-ledger.json',
    'src/copy/website-image-optimizer-mcp.md',
    'src/copy/website-image-optimizer-mcp-docs.md',
  ],
}, null, 2)}\n`);
