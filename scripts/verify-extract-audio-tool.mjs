import fs from 'node:fs';
import path from 'node:path';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(`Extract Audio verification failed: ${message}`);
}

const runtimeDir = 'dist/tools/extract-audio-from-video/runtime';
const page = read('dist/tools/extract-audio-from-video/index.html');
const worker = read('dist/tools/extract-audio-from-video/processor.js');
const runtimeCore = read(path.join(runtimeDir, 'mediabunny.min.js'));
const runtimeMp3 = read(path.join(runtimeDir, 'mediabunny-mp3-encoder.min.js'));
const ffmpegCore = read(path.join(runtimeDir, 'ffmpeg-core.js'));
const ffmpegManifest = JSON.parse(read(path.join(runtimeDir, 'ffmpeg-core.manifest.json')));
const vendorScript = read('scripts/vendor-extract-audio-runtime.mjs');
const pinterest = read('dist/pinterest-downloader/index.html');
const sitemap = read('dist/sitemap.xml');
const analytics = read('src/lib/analytics.ts');
const collector = read('functions/api/collect.js');

assert(page.includes('<link rel="canonical" href="https://layerporter.com/tools/extract-audio-from-video/"'), 'canonical missing');
assert(page.includes('Extract audio from video'), 'H1/tool copy missing');
assert(page.includes('id="eav-file"'), 'file picker missing');
assert(page.includes('250 MB'), 'visible file limit missing');
assert(page.includes('MP3 · 320 kbps'), 'output format/bitrate missing');
assert(page.includes('id="eav-player"'), 'audio playback control missing');
assert(page.includes('id="eav-download"'), 'download action missing');
assert(!page.includes('cdn.jsdelivr.net'), 'heavy runtime leaked into initial HTML');

assert(worker.includes("RUNTIME_BUILD = 'lp078-20260911-ffmpeg1'"), 'runtime build id missing');
assert(worker.includes('./runtime/mediabunny.min.js?v=${RUNTIME_BUILD}'), 'versioned same-origin Mediabunny runtime missing');
assert(worker.includes('./runtime/mediabunny-mp3-encoder.min.js?v=${RUNTIME_BUILD}'), 'versioned same-origin Mediabunny MP3 runtime missing');
assert(worker.includes('./runtime/ffmpeg-core.js?v=${RUNTIME_BUILD}'), 'same-origin FFmpeg fallback JS missing');
assert(worker.includes('./runtime/ffmpeg-core.manifest.json?v=${RUNTIME_BUILD}'), 'same-origin FFmpeg fallback manifest missing');
assert(worker.includes("new mediabunny.BlobSource(file)"), 'Mediabunny local BlobSource processing missing');
assert(worker.includes('mediabunny.Conversion.init'), 'Mediabunny conversion pipeline missing');
assert(worker.includes("video: { discard: true }"), 'Mediabunny video discard step missing');
assert(worker.includes("'-c:a', 'libmp3lame'"), 'FFmpeg MP3 fallback command missing');
assert(worker.includes("'-threads', '1'"), 'FFmpeg fallback is not pinned to single thread');
assert(worker.includes('createFFmpegCore({ wasmBinary })'), 'FFmpeg direct-core wasmBinary bootstrap missing');
assert(worker.includes("cache: 'no-store'"), 'fallback runtime fetches are not cache-safe');
assert(worker.includes('MAX_FILE_BYTES = 250 * 1024 * 1024'), 'worker limit guard missing');
assert(!worker.includes('cdn.jsdelivr.net'), 'worker still depends on runtime CDN');
assert(!worker.includes('XMLHttpRequest'), 'worker contains direct XMLHttpRequest');
assert(!worker.includes('FormData'), 'worker contains FormData');
assert(!worker.includes('fetch(file'), 'worker appears to fetch the user file');

assert(vendorScript.includes("const MEDIABUNNY_VERSION = '1.55.7'"), 'Mediabunny vendor version is not pinned');
assert(vendorScript.includes("const FFMPEG_CORE_VERSION = '0.12.10'"), 'FFmpeg vendor version is not pinned');
assert(vendorScript.includes('mediabunny@${MEDIABUNNY_VERSION}/dist/bundles/mediabunny.min.cjs'), 'pinned Mediabunny source missing');
assert(vendorScript.includes('@mediabunny/mp3-encoder@${MEDIABUNNY_VERSION}/dist/bundles/mediabunny-mp3-encoder.min.js'), 'pinned Mediabunny MP3 source missing');
assert(vendorScript.includes('@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd/ffmpeg-core.js'), 'pinned FFmpeg JS source missing');
assert(vendorScript.includes('@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd/ffmpeg-core.wasm'), 'pinned FFmpeg WASM source missing');
assert(vendorScript.includes('WASM_PART_BYTES = 16 * 1024 * 1024'), 'Cloudflare-safe WASM splitting missing');

assert(runtimeCore.length > 50_000 && runtimeCore.includes('Mediabunny') && runtimeCore.includes('BlobSource'), 'vendored Mediabunny runtime invalid');
assert(runtimeMp3.length > 100_000 && runtimeMp3.includes('MediabunnyMp3Encoder') && runtimeMp3.includes('registerMp3Encoder'), 'vendored Mediabunny MP3 runtime invalid');
assert(ffmpegCore.length > 50_000 && ffmpegCore.includes('createFFmpegCore') && ffmpegCore.includes('ffprobe'), 'vendored FFmpeg core glue invalid');
assert(ffmpegManifest.engine === '@ffmpeg/core' && ffmpegManifest.version === '0.12.10', 'FFmpeg manifest metadata invalid');
assert(Array.isArray(ffmpegManifest.parts) && ffmpegManifest.parts.length >= 2, 'FFmpeg WASM was not split into multiple files');
assert(ffmpegManifest.totalBytes > 20 * 1024 * 1024, 'FFmpeg WASM manifest total is unexpectedly small');
let totalPartBytes = 0;
for (const part of ffmpegManifest.parts) {
  const partPath = path.join(runtimeDir, part.file);
  assert(fs.existsSync(partPath), `FFmpeg WASM part missing: ${part.file}`);
  const stat = fs.statSync(partPath);
  assert(stat.size === part.bytes, `FFmpeg WASM part size mismatch: ${part.file}`);
  assert(stat.size < 25 * 1024 * 1024, `FFmpeg WASM part exceeds Cloudflare Pages limit: ${part.file}`);
  totalPartBytes += stat.size;
}
assert(totalPartBytes === ffmpegManifest.totalBytes, 'FFmpeg WASM split total mismatch');
const firstWasmPart = fs.readFileSync(path.join(runtimeDir, ffmpegManifest.parts[0].file));
assert(firstWasmPart[0] === 0x00 && firstWasmPart[1] === 0x61 && firstWasmPart[2] === 0x73 && firstWasmPart[3] === 0x6d, 'FFmpeg WASM signature invalid');

assert(sitemap.includes('<loc>https://layerporter.com/tools/extract-audio-from-video/</loc>'), 'sitemap entry missing');
assert(pinterest.includes('data-audio-tool-link'), 'Pinterest handoff link missing');
assert(pinterest.includes('/tools/extract-audio-from-video/?source=pinterest_downloader'), 'Pinterest source attribution missing');
assert(analytics.includes('tools(?:/[a-z0-9-]+)?'), 'client analytics route bucket missing tools');
assert(collector.includes('tools(?:/[a-z0-9-]+)?'), 'server analytics route bucket missing tools');

console.log(`Extract Audio static/build verification: PASS — Mediabunny primary + FFmpeg ${ffmpegManifest.version} fallback, ${ffmpegManifest.parts.length} WASM parts`);
