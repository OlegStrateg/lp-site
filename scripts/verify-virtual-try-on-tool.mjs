import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(`Virtual Try-On verification failed: ${message}`);
}

const pagePath = 'dist/tools/virtual-try-on/index.html';
const appPath = 'dist/tools/virtual-try-on/app.js';
const noticesPath = 'dist/tools/virtual-try-on/THIRD_PARTY_NOTICES.txt';

assert(fs.existsSync(pagePath), 'built page missing');
assert(fs.existsSync(appPath), 'browser runtime missing');
assert(fs.existsSync(noticesPath), 'third-party notices missing');

const page = read(pagePath);
const app = read(appPath);
const notices = read(noticesPath);
const headers = read('dist/_headers');
const sitemap = read('dist/sitemap.xml');

assert(page.includes('<link rel="canonical" href="https://layerporter.com/tools/virtual-try-on/"'), 'canonical missing');
assert(page.includes('noindex, nofollow, noarchive, nosnippet, noimageindex'), 'candidate noindex guard missing');
assert(page.includes('id="vto-person-input"'), 'person input missing');
assert(page.includes('id="vto-garment-input"'), 'garment input missing');
assert(page.includes('id="vto-run"'), 'run action missing');
assert(page.includes('id="vto-canvas"'), 'result canvas missing');
assert(page.includes('id="vto-download"'), 'PNG export missing');
assert(page.includes('/tools/virtual-try-on/app.js'), 'local app module missing');
assert(page.includes('MediaPipe may send technical performance and usage metrics to Google'), 'runtime privacy disclosure missing');
assert(page.includes('Preview, not sizing advice.'), 'sizing disclaimer missing');

assert(app.includes("@mediapipe/tasks-vision@1.0.1/+esm"), 'MediaPipe package is not pinned to 1.0.1');
assert(app.includes("@mediapipe/tasks-vision@1.0.1/wasm"), 'MediaPipe WASM path is not pinned');
assert(app.includes('pose_landmarker_lite/float16/1/pose_landmarker_lite.task'), 'pose model is not pinned');
assert(app.includes("runningMode: 'IMAGE'"), 'single-image pose mode missing');
assert(app.includes("options('GPU')"), 'GPU pose path missing');
assert(app.includes("options('CPU')"), 'CPU fallback missing');
assert(app.includes('if (state.pose) return state.pose;'), 'pose cache missing');
assert(app.includes('armOverlay: null'), 'arm overlay cache state missing');
assert(app.includes('state.armOverlay = { canvas: layer, width, height }'), 'arm overlay cache write missing');
assert(app.includes('refreshRunState(false)'), 'error-preserving run-state refresh missing');
assert(app.includes('let succeeded = false;'), 'explicit successful-run guard missing');
assert(app.includes('renderResult();'), 'local rerender path missing');
assert(app.includes("link.download = `layerporter-virtual-try-on-${Date.now()}.png`"), 'PNG download filename missing');
assert(!app.includes('FormData'), 'user image upload primitive detected');
assert(!app.includes('XMLHttpRequest'), 'XMLHttpRequest detected');
assert(!app.includes('navigator.sendBeacon'), 'sendBeacon detected');
assert(!app.includes("fetch('/api"), 'LayerPorter API fetch detected');
assert(!app.includes('fetch("/api'), 'LayerPorter API fetch detected');
assert(!app.includes('apiKey'), 'API key marker detected');
assert(!app.includes('Authorization'), 'authorization header marker detected');

assert(headers.includes('/tools/virtual-try-on/*'), 'scoped CSP route missing');
assert(headers.includes("https://cdn.jsdelivr.net https://storage.googleapis.com"), 'model/runtime connect-src allowlist missing');
assert(headers.includes('X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex'), 'header noindex guard missing');
assert(!sitemap.includes('<loc>https://layerporter.com/tools/virtual-try-on/</loc>'), 'candidate unexpectedly entered sitemap');

assert(notices.includes('@mediapipe/tasks-vision'), 'MediaPipe notice missing');
assert(notices.includes('Apache License 2.0'), 'MediaPipe license notice missing');
assert(notices.includes('@practics/tryon-core'), 'engineering reference notice missing');
assert(notices.includes('License: MIT'), 'tryon-core MIT notice missing');

const syntax = spawnSync(process.execPath, ['--check', appPath], { encoding: 'utf8' });
assert(syntax.status === 0, `app.js syntax check failed: ${syntax.stderr || syntax.stdout}`);

console.log('Virtual Try-On static/build verification: PASS — local instant preview candidate, pinned MediaPipe 1.0.1, cached pose/arm overlay, no LayerPorter upload API');
