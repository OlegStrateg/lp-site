import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ArtifactStore, parseArtifactId } from '../src/artifact-store.js';

async function withStore(options, fn) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'lp095-artifact-test-'));
  const store = new ArtifactStore({ rootDir: path.join(temp, 'artifacts'), ...options });
  try {
    return await fn(store);
  } finally {
    await store.dispose();
    await fs.rm(temp, { recursive: true, force: true });
  }
}

test('artifact store writes only to isolated temp root and verifies integrity on read', async () => {
  await withStore({}, async (store) => {
    const buffer = Buffer.from('layerporter-artifact-payload');
    const artifact = await store.put(buffer, { name: 'sample.webp', mimeType: 'image/webp' });
    assert.match(artifact.uri, /^layerporter-artifact:\/\/artifact\/[a-f0-9]{32}$/);
    assert.equal(parseArtifactId(artifact.uri), artifact.id);
    assert.equal(artifact.size, buffer.length);
    assert.equal(artifact.sha256, crypto.createHash('sha256').update(buffer).digest('hex'));
    assert.equal(Object.prototype.hasOwnProperty.call(artifact, 'filePath'), false);

    const record = store.records.get(artifact.id);
    const stat = await fs.stat(record.filePath);
    assert.equal(stat.mode & 0o777, 0o600);

    const read = await store.read(artifact.uri);
    assert.deepEqual(read.buffer, buffer);
    assert.equal(read.sha256, artifact.sha256);
  });
});

test('artifact store enforces per-file and total byte budgets', async () => {
  await withStore({ maxArtifactBytes: 4, maxTotalBytes: 6, maxArtifacts: 2 }, async (store) => {
    await assert.rejects(() => store.put(Buffer.alloc(5)), (error) => error.code === 'ARTIFACT_TOO_LARGE');
    await store.put(Buffer.alloc(3), { name: 'one.webp', mimeType: 'image/webp' });
    await store.put(Buffer.alloc(3), { name: 'two.webp', mimeType: 'image/webp' });
    await assert.rejects(() => store.put(Buffer.alloc(1)), (error) => error.code === 'ARTIFACT_STORE_FULL');
  });
});

test('artifact URI cannot become an arbitrary filesystem path', async () => {
  assert.throws(() => parseArtifactId('layerporter-artifact://artifact/../../etc/passwd'));
  assert.throws(() => parseArtifactId('file:///etc/passwd'));
  assert.throws(() => parseArtifactId('../secret'));
});
