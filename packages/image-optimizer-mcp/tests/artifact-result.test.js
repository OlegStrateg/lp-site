import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ArtifactStore } from '../src/artifact-store.js';
import { artifactToolResult } from '../src/artifact-result.js';

test('artifact tool result returns resource_link while keeping binary out of model text', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'lp095-result-test-'));
  const store = new ArtifactStore({ rootDir: path.join(temp, 'artifacts') });
  const marker = 'LP095_BINARY_MARKER';
  try {
    const buffer = Buffer.from(marker.repeat(20));
    const result = await artifactToolResult({
      status: 'ACCEPT',
      output: { format: 'webp', width: 320, height: 200 },
      savingsBytes: 123,
      buffer,
    }, store);

    assert.equal(result.content[0].type, 'text');
    assert.doesNotMatch(result.content[0].text, new RegExp(marker));
    assert.doesNotMatch(result.content[0].text, new RegExp(buffer.toString('base64')));

    const link = result.content.find((item) => item.type === 'resource_link');
    assert.ok(link);
    assert.equal(link.mimeType, 'image/webp');
    assert.equal(link.size, buffer.length);

    const stored = await store.read(link.uri);
    assert.deepEqual(stored.buffer, buffer);
  } finally {
    await store.dispose();
    await fs.rm(temp, { recursive: true, force: true });
  }
});
