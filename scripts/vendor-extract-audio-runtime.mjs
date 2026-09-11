import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const MEDIABUNNY_VERSION = '1.55.7';
const FFMPEG_CORE_VERSION = '0.12.10';
const TARGET_DIR = path.resolve('dist/tools/extract-audio-from-video/runtime');
const WASM_PART_BYTES = 16 * 1024 * 1024;

const assets = [
  {
    name: 'Mediabunny core',
    version: MEDIABUNNY_VERSION,
    file: 'mediabunny.min.js',
    sources: [
      `https://cdn.jsdelivr.net/npm/mediabunny@${MEDIABUNNY_VERSION}/dist/bundles/mediabunny.min.cjs`,
      `https://unpkg.com/mediabunny@${MEDIABUNNY_VERSION}/dist/bundles/mediabunny.min.cjs`,
    ],
    minBytes: 50_000,
    markers: ['Mediabunny', 'BlobSource'],
  },
  {
    name: 'Mediabunny MP3 encoder',
    version: MEDIABUNNY_VERSION,
    file: 'mediabunny-mp3-encoder.min.js',
    sources: [
      `https://cdn.jsdelivr.net/npm/@mediabunny/mp3-encoder@${MEDIABUNNY_VERSION}/dist/bundles/mediabunny-mp3-encoder.min.js`,
      `https://unpkg.com/@mediabunny/mp3-encoder@${MEDIABUNNY_VERSION}/dist/bundles/mediabunny-mp3-encoder.min.js`,
    ],
    minBytes: 100_000,
    markers: ['MediabunnyMp3Encoder', 'registerMp3Encoder'],
  },
  {
    name: 'FFmpeg single-thread core glue',
    version: FFMPEG_CORE_VERSION,
    file: 'ffmpeg-core.js',
    sources: [
      `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd/ffmpeg-core.js`,
      `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd/ffmpeg-core.js`,
    ],
    minBytes: 50_000,
    markers: ['createFFmpegCore', 'ffprobe', 'setProgress'],
  },
];

const ffmpegWasm = {
  name: 'FFmpeg single-thread WASM',
  version: FFMPEG_CORE_VERSION,
  sources: [
    `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd/ffmpeg-core.wasm`,
    `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd/ffmpeg-core.wasm`,
  ],
  minBytes: 20 * 1024 * 1024,
};

async function download(asset) {
  let lastError = null;
  for (const url of asset.sources) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(60_000),
        headers: { 'user-agent': 'LayerPorter-build/1.0' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < asset.minBytes) throw new Error(`unexpectedly small payload: ${buffer.byteLength} bytes`);
      return { buffer, url };
    } catch (error) {
      lastError = error;
      console.warn(`[extract-audio-runtime] ${asset.name}: ${url} failed: ${error.message}`);
    }
  }
  throw new Error(`[extract-audio-runtime] ${asset.name}: all pinned sources failed: ${lastError?.message || 'unknown error'}`);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

await fs.mkdir(TARGET_DIR, { recursive: true });

for (const asset of assets) {
  const { buffer, url } = await download(asset);
  const text = buffer.toString('utf8');
  if (text.trimStart().startsWith('<')) throw new Error(`[extract-audio-runtime] ${asset.name}: received HTML instead of JavaScript`);
  for (const marker of asset.markers) {
    if (!text.includes(marker)) throw new Error(`[extract-audio-runtime] ${asset.name}: missing marker ${marker}`);
  }
  const target = path.join(TARGET_DIR, asset.file);
  await fs.writeFile(target, buffer);
  console.log(`[extract-audio-runtime] ${asset.name} ${asset.version} -> ${path.relative(process.cwd(), target)} (${buffer.byteLength} bytes, sha256 ${sha256(buffer)}, source ${url})`);
}

const { buffer: wasmBuffer, url: wasmSource } = await download(ffmpegWasm);
if (wasmBuffer[0] !== 0x00 || wasmBuffer[1] !== 0x61 || wasmBuffer[2] !== 0x73 || wasmBuffer[3] !== 0x6d) {
  throw new Error('[extract-audio-runtime] FFmpeg WASM: invalid WebAssembly signature');
}

const parts = [];
for (let offset = 0, index = 1; offset < wasmBuffer.byteLength; offset += WASM_PART_BYTES, index += 1) {
  const part = wasmBuffer.subarray(offset, Math.min(offset + WASM_PART_BYTES, wasmBuffer.byteLength));
  const file = `ffmpeg-core.wasm.part-${String(index).padStart(2, '0')}`;
  const target = path.join(TARGET_DIR, file);
  await fs.writeFile(target, part);
  parts.push({ file, bytes: part.byteLength, sha256: sha256(part) });
  console.log(`[extract-audio-runtime] FFmpeg WASM part ${index} -> ${path.relative(process.cwd(), target)} (${part.byteLength} bytes)`);
}

if (parts.length < 2) throw new Error('[extract-audio-runtime] FFmpeg WASM was not split; Cloudflare Pages requires assets below 25 MiB');
if (parts.some((part) => part.bytes >= 25 * 1024 * 1024)) throw new Error('[extract-audio-runtime] FFmpeg WASM part exceeds Cloudflare Pages 25 MiB asset limit');

const manifest = {
  engine: '@ffmpeg/core',
  version: FFMPEG_CORE_VERSION,
  source: wasmSource,
  totalBytes: wasmBuffer.byteLength,
  sha256: sha256(wasmBuffer),
  parts,
};
await fs.writeFile(path.join(TARGET_DIR, 'ffmpeg-core.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`[extract-audio-runtime] FFmpeg WASM ${FFMPEG_CORE_VERSION} split into ${parts.length} same-origin asset(s), total ${wasmBuffer.byteLength} bytes, sha256 ${manifest.sha256}`);
