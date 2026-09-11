import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const VERSION = '1.55.7';
const TARGET_DIR = path.resolve('dist/tools/extract-audio-from-video/runtime');

const assets = [
  {
    name: 'Mediabunny core',
    file: 'mediabunny.min.js',
    sources: [
      `https://cdn.jsdelivr.net/npm/mediabunny@${VERSION}/dist/bundles/mediabunny.min.cjs`,
      `https://unpkg.com/mediabunny@${VERSION}/dist/bundles/mediabunny.min.cjs`,
    ],
    minBytes: 50_000,
    markers: ['Mediabunny', 'BlobSource'],
  },
  {
    name: 'Mediabunny MP3 encoder',
    file: 'mediabunny-mp3-encoder.min.js',
    sources: [
      `https://cdn.jsdelivr.net/npm/@mediabunny/mp3-encoder@${VERSION}/dist/bundles/mediabunny-mp3-encoder.min.js`,
      `https://unpkg.com/@mediabunny/mp3-encoder@${VERSION}/dist/bundles/mediabunny-mp3-encoder.min.js`,
    ],
    minBytes: 100_000,
    markers: ['MediabunnyMp3Encoder', 'registerMp3Encoder'],
  },
];

async function downloadAsset(asset) {
  let lastError = null;
  for (const url of asset.sources) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
        headers: { 'user-agent': 'LayerPorter-build/1.0' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const text = buffer.toString('utf8');
      if (buffer.byteLength < asset.minBytes) throw new Error(`unexpectedly small payload: ${buffer.byteLength} bytes`);
      if (text.trimStart().startsWith('<')) throw new Error('received HTML instead of JavaScript');
      for (const marker of asset.markers) {
        if (!text.includes(marker)) throw new Error(`missing marker ${marker}`);
      }
      return { buffer, url };
    } catch (error) {
      lastError = error;
      console.warn(`[extract-audio-runtime] ${asset.name}: ${url} failed: ${error.message}`);
    }
  }
  throw new Error(`[extract-audio-runtime] ${asset.name}: all pinned sources failed: ${lastError?.message || 'unknown error'}`);
}

await fs.mkdir(TARGET_DIR, { recursive: true });

for (const asset of assets) {
  const { buffer, url } = await downloadAsset(asset);
  const target = path.join(TARGET_DIR, asset.file);
  await fs.writeFile(target, buffer);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  console.log(`[extract-audio-runtime] ${asset.name} ${VERSION} -> ${path.relative(process.cwd(), target)} (${buffer.byteLength} bytes, sha256 ${sha256}, source ${url})`);
}
