import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(`Extract Audio verification failed: ${message}`);
}

const page = read('dist/tools/extract-audio-from-video/index.html');
const worker = read('dist/tools/extract-audio-from-video/processor.js');
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

assert(worker.includes('mediabunny@1.55.7'), 'Mediabunny version is not pinned');
assert(worker.includes('@mediabunny/mp3-encoder@1.55.7'), 'MP3 encoder version is not pinned');
assert(worker.includes('new api.BlobSource(file)'), 'local BlobSource processing missing');
assert(worker.includes('api.Conversion.init'), 'conversion pipeline missing');
assert(worker.includes("video: { discard: true }"), 'video discard step missing');
assert(worker.includes('MAX_FILE_BYTES = 250 * 1024 * 1024'), 'worker limit guard missing');
assert(!worker.includes('fetch('), 'worker must not upload/fetch the user file');
assert(!worker.includes('XMLHttpRequest'), 'worker contains XMLHttpRequest');
assert(!worker.includes('FormData'), 'worker contains FormData');

assert(sitemap.includes('<loc>https://layerporter.com/tools/extract-audio-from-video/</loc>'), 'sitemap entry missing');
assert(pinterest.includes('data-audio-tool-link'), 'Pinterest handoff link missing');
assert(pinterest.includes('/tools/extract-audio-from-video/?source=pinterest_downloader'), 'Pinterest source attribution missing');
assert(analytics.includes('tools(?:/[a-z0-9-]+)?'), 'client analytics route bucket missing tools');
assert(collector.includes('tools(?:/[a-z0-9-]+)?'), 'server analytics route bucket missing tools');

console.log('Extract Audio static/build verification: PASS');
