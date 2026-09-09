import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverSource = fs.readFileSync(path.join(here, '../src/server.js'), 'utf8');
const toolsSource = fs.readFileSync(path.join(here, '../src/tools.js'), 'utf8');

const names = [
  'analyze_page_images',
  'optimize_image',
  'generate_responsive_variants',
  'compare_image_versions',
  'optimize_page_images',
];

test('exactly five Pareto MCP tools are exposed', () => {
  for (const name of names) assert.match(serverSource, new RegExp(`['\"]${name}['\"]`));
  const registrations = [...serverSource.matchAll(/server\.registerTool\(/g)];
  assert.equal(registrations.length, 5);
});

test('batch and responsive operations are bounded', () => {
  assert.match(serverSource, /\.max\(20\)/);
  assert.match(serverSource, /\.max\(6\)/);
  assert.match(toolsSource, /Math\.min\(input\.maxItems \?\? 10, 20\)/);
});

test('MCP layer has no production write or arbitrary filesystem operation', () => {
  assert.doesNotMatch(serverSource + toolsSource, /writeFile|unlink|rename|rmSync|exec\(|spawn\(/);
  assert.doesNotMatch(serverSource + toolsSource, /fetch\(|axios|http\.request|https\.request/);
});

test('v2 split MCP server package and registerTool API are used', () => {
  assert.match(serverSource, /@modelcontextprotocol\/server/);
  assert.match(serverSource, /server\.registerTool\(/);
  assert.doesNotMatch(serverSource, /server\.tool\(/);
  assert.doesNotMatch(serverSource, /@modelcontextprotocol\/sdk/);
});
