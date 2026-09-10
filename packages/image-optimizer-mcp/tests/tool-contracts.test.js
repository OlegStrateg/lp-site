import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverSource = fs.readFileSync(path.join(here, '../src/server.js'), 'utf8');
const toolsSource = fs.readFileSync(path.join(here, '../src/tools.js'), 'utf8');
const secureFetchSource = fs.readFileSync(path.join(here, '../src/secure-fetch.js'), 'utf8');
const artifactStoreSource = fs.readFileSync(path.join(here, '../src/artifact-store.js'), 'utf8');
const urlIngestionSource = fs.readFileSync(path.join(here, '../src/url-ingestion.js'), 'utf8');

const names = [
  'analyze_page_images',
  'optimize_image',
  'generate_responsive_variants',
  'compare_image_versions',
  'optimize_page_images',
  'analyze_url_images',
  'optimize_url_images',
];

test('seven bounded MCP tools are exposed after URL ingestion extension', () => {
  for (const name of names) assert.match(serverSource, new RegExp(`['\\"]${name}['\\"]`));
  const registrations = [...serverSource.matchAll(/server\.registerTool\(/g)];
  assert.equal(registrations.length, 7);
});

test('batch, responsive and URL operations remain bounded', () => {
  assert.match(serverSource, /\.max\(20\)/);
  assert.match(serverSource, /\.max\(6\)/);
  assert.match(serverSource, /\.max\(10\)/);
  assert.match(toolsSource, /Math\.min\(input\.maxItems \?\? 10, 20\)/);
  assert.match(urlIngestionSource, /maxTotalImageBytes:\s*24 \* 1024 \* 1024/);
  assert.match(urlIngestionSource, /concurrency:\s*2/);
});

test('network access and filesystem writes are isolated behind dedicated safety modules', () => {
  assert.doesNotMatch(serverSource + toolsSource, /node:http|node:https|node:fs|writeFile|unlink|rename|rmSync/);
  assert.doesNotMatch(urlIngestionSource, /node:http|node:https|http\.request|https\.request/);
  assert.match(secureFetchSource, /node:http/);
  assert.match(secureFetchSource, /node:https/);
  assert.match(secureFetchSource, /createSafeLookup/);
  assert.match(secureFetchSource, /URL_CREDENTIALS_BLOCKED/);
  assert.match(artifactStoreSource, /os\.tmpdir\(\)/);
  assert.match(artifactStoreSource, /mode:\s*0o600/);
  assert.doesNotMatch(artifactStoreSource, /process\.cwd\(\)/);
});

test('v2 MCP resource template is used for binary artifact delivery', () => {
  assert.match(serverSource, /ResourceTemplate/);
  assert.match(serverSource, /layerporter-artifact:\/\/artifact\/\{id\}/);
  assert.match(serverSource, /blob:\s*artifact\.buffer\.toString\('base64'\)/);
  assert.match(serverSource, /artifactToolResult/);
});

test('all local transforms stay closed and URL tools are explicitly open-world read-only', () => {
  assert.match(serverSource, /readOnlyHint:\s*true/);
  assert.match(serverSource, /destructiveHint:\s*false/);
  assert.match(serverSource, /idempotentHint:\s*true/);
  const closedUses = [...serverSource.matchAll(/annotations:\s*CLOSED_TRANSFORM_ANNOTATIONS/g)];
  const openUses = [...serverSource.matchAll(/annotations:\s*OPEN_WORLD_READ_ANNOTATIONS/g)];
  assert.equal(closedUses.length, 5);
  assert.equal(openUses.length, 2);
  assert.match(serverSource, /openWorldHint:\s*false/);
  assert.match(serverSource, /openWorldHint:\s*true/);
});
