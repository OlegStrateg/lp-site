import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeForText, textResult } from '../src/text-result.js';

test('Buffer is summarized before JSON serialization', () => {
  const buffer = Buffer.from([1, 2, 3, 4]);
  assert.deepEqual(sanitizeForText({ buffer }), {
    buffer: { type: 'binary', byteLength: 4 },
  });
});

test('Buffer.toJSON-shaped objects are also stripped', () => {
  const safe = sanitizeForText({ nested: { type: 'Buffer', data: [1, 2, 3] } });
  assert.deepEqual(safe, {
    nested: { type: 'binary', byteLength: 3 },
  });
});

test('MCP text result never contains binary data arrays or base64 payload copy', () => {
  const marker = 'LP_BINARY_SECRET_MARKER';
  const buffer = Buffer.from(marker, 'utf8');
  const result = textResult({ output: { buffer } });
  const text = result.content[0].text;

  assert.doesNotMatch(text, /"data"\s*:/);
  assert.doesNotMatch(text, new RegExp(marker));
  assert.doesNotMatch(text, new RegExp(buffer.toString('base64')));
  assert.match(text, /"byteLength"/);
});
