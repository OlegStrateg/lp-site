import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(`Virtual Try-On verification failed: ${message}`);
}

const pagePath = 'dist/tools/virtual-try-on/index.html';
const noticesPath = 'dist/tools/virtual-try-on/THIRD_PARTY_NOTICES.txt';
const rejectedAppPath = 'dist/tools/virtual-try-on/app.js';
const rejectedGeometryPath = 'dist/tools/virtual-try-on/geometry.js';

assert(fs.existsSync(pagePath), 'built page missing');
assert(fs.existsSync(noticesPath), 'third-party notices missing');
assert(!fs.existsSync(rejectedAppPath), 'rejected custom app.js leaked into candidate');
assert(!fs.existsSync(rejectedGeometryPath), 'rejected custom geometry.js leaked into candidate');

const page = read(pagePath);
const notices = read(noticesPath);
const headers = read('dist/_headers');
const sitemap = read('dist/sitemap.xml');

assert(page.includes('<link rel="canonical" href="https://layerporter.com/tools/virtual-try-on/"'), 'canonical missing');
assert(page.includes('noindex, nofollow, noarchive, nosnippet, noimageindex'), 'candidate noindex guard missing');
assert(page.includes('LP-098 · READY CORE CANDIDATE'), 'ready-core candidate marker missing');
assert(page.includes('https://pravoobi.github.io/try-on/'), 'upstream ready-core iframe missing');
assert(page.includes('pravoobi/try-on · browser-native'), 'upstream engine attribution missing');
assert(page.includes('old code that stretched an arbitrary uploaded image'), 'rejected-prototype notice missing');
assert(page.includes('Real segmentation, pose estimation, TPS garment warp, occlusion'), 'ready-core capability statement missing');
assert(!page.includes('/tools/virtual-try-on/app.js'), 'rejected custom runtime still referenced');
assert(!page.includes('id="vto-person-input"'), 'old custom upload UI still present');

assert(headers.includes('/tools/virtual-try-on/*'), 'scoped candidate route missing');
assert(headers.includes('X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex'), 'header noindex guard missing');
assert(!sitemap.includes('<loc>https://layerporter.com/tools/virtual-try-on/</loc>'), 'candidate unexpectedly entered sitemap');

assert(notices.includes('@practics/tryon-core'), 'tryon-core notice missing');
assert(notices.includes('License: MIT'), 'tryon-core MIT notice missing');
assert(notices.includes('pravoobi/try-on'), 'upstream project notice missing');

console.log('Virtual Try-On verification: PASS — rejected custom warp removed, ready upstream core isolated behind noindex candidate');
