import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import jpeg from 'jpeg-js';

const DIST = path.resolve('dist');
const WORK = await fs.mkdtemp(path.join(os.tmpdir(), 'lp-image-workspace-'));
const DOWNLOADS = path.join(WORK, 'downloads');
const EVIDENCE = path.resolve('artifacts/image-tools');
await fs.mkdir(DOWNLOADS, { recursive: true });
await fs.mkdir(EVIDENCE, { recursive: true });

function findExecutable(names) {
  for (const name of names) {
    const hit = spawnSync('bash', ['-lc', `command -v ${name}`], { encoding: 'utf8' });
    if (hit.status === 0 && hit.stdout.trim()) return hit.stdout.trim();
  }
  throw new Error(`Executable not found: ${names.join(', ')}`);
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function waitFor(check, timeout = 30000, label = 'condition') {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      last = await check();
      if (last) return last;
    } catch (error) { last = String(error?.message || error); }
    await delay(120);
  }
  throw new Error(`Timeout waiting for ${label}; last=${JSON.stringify(last)}`);
}
async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}
function makeJpeg(width, height, seed) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = (x + seed) % 256;
      data[i + 1] = (y * 2 + seed * 3) % 256;
      data[i + 2] = (x + y + seed * 7) % 256;
      data[i + 3] = 255;
    }
  }
  return Buffer.from(jpeg.encode({ data, width, height }, 90).data);
}

const firstPath = path.join(WORK, 'workspace-first-640x480.jpg');
const secondPath = path.join(WORK, 'workspace-second-300x200.jpg');
await fs.writeFile(firstPath, makeJpeg(640, 480, 17));
await fs.writeFile(secondPath, makeJpeg(300, 200, 41));

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp'], ['.woff2', 'font/woff2'],
]);
const requests = [];
const port = await freePort();
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  let body = Buffer.alloc(0);
  for await (const chunk of req) body = Buffer.concat([body, Buffer.from(chunk)]);
  requests.push({ method: req.method, path: url.pathname, contentType: req.headers['content-type'] || '', bytes: body.length });
  if (url.pathname === '/api/collect') { res.statusCode = 204; res.end(); return; }
  let filePath = path.join(DIST, decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html');
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    const data = await fs.readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypes.get(path.extname(filePath)) || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
});
await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

class Cdp {
  constructor(url) { this.ws = new WebSocket(url); this.id = 1; this.pending = new Map(); this.events = []; }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result || {});
      } else this.events.push(message);
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

async function evalValue(cdp, expression, awaitPromise = false) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (result.exceptionDetails) throw new Error(`Browser evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  return result.result?.value;
}
async function upload(cdp, selector, filePath) {
  const doc = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const node = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
  if (!node.nodeId) throw new Error(`File input not found: ${selector}`);
  await cdp.send('DOM.setFileInputFiles', { files: [filePath], nodeId: node.nodeId });
  await evalValue(cdp, `document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('change',{bubbles:true})); true`);
}
async function waitState(cdp, selector, expected) {
  return waitFor(async () => {
    const current = await evalValue(cdp, `document.querySelector(${JSON.stringify(selector)})?.dataset?.state || ''`);
    if (current === 'error') throw new Error(`${selector} entered error state`);
    return current === expected ? current : null;
  }, 30000, `${selector} state=${expected}`);
}
async function waitPath(cdp, pathname) {
  return waitFor(async () => {
    const state = await evalValue(cdp, `({path:location.pathname, ready:document.readyState, title:document.title, canonical:document.querySelector('link[rel="canonical"]')?.href||''})`);
    return state?.path === pathname && state.ready === 'complete' ? state : null;
  }, 30000, `path ${pathname}`);
}
async function waitImage(cdp, selector) {
  return waitFor(async () => {
    const value = await evalValue(cdp, `(() => { const img=document.querySelector(${JSON.stringify(selector)}); return img&&img.complete?{w:img.naturalWidth,h:img.naturalHeight}:null; })()`);
    return value?.w > 0 && value?.h > 0 ? value : null;
  }, 20000, `image ${selector}`);
}
async function screenshot(cdp, name) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await fs.writeFile(path.join(EVIDENCE, name), Buffer.from(shot.data, 'base64'));
}
async function download(cdp, selector) {
  const before = new Set(await fs.readdir(DOWNLOADS));
  await evalValue(cdp, `document.querySelector(${JSON.stringify(selector)}).click(); true`);
  return waitFor(async () => {
    const files = await fs.readdir(DOWNLOADS);
    return files.find((file) => !before.has(file) && !file.endsWith('.crdownload')) || null;
  }, 20000, `download ${selector}`);
}
async function decodeJpegDimensions(filePath) {
  const decoded = jpeg.decode(await fs.readFile(filePath), { useTArray: true });
  return { width: decoded.width, height: decoded.height };
}

const chrome = findExecutable(['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']);
const debugPort = await freePort();
const chromeProc = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-allow-origins=*',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${path.join(WORK, 'chrome-profile')}`, 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
let chromeStderr = '';
chromeProc.stderr.on('data', (chunk) => { chromeStderr += chunk.toString(); });
await waitFor(async () => {
  try { const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`); return response.ok; } catch { return false; }
}, 20000, 'Chrome');
const tabResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`http://127.0.0.1:${port}/tools/resize-image/`)}`, { method: 'PUT' });
const tab = await tabResponse.json();
const cdp = new Cdp(tab.webSocketDebuggerUrl);
await cdp.open();
await cdp.send('Runtime.enable');
await cdp.send('Page.enable');
await cdp.send('DOM.enable');
await cdp.send('Log.enable');
await cdp.send('Network.enable');
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS, eventsEnabled: true });
await waitPath(cdp, '/tools/resize-image/');

const report = { startedAt: new Date().toISOString(), chrome, workspace: {}, output: {}, mobile: {}, network: {}, result: null };
try {
  const navigationCount = await evalValue(cdp, `performance.getEntriesByType('navigation').length`);

  // Load once in Resize and save tool-specific controls.
  await upload(cdp, '#resize-file', firstPath);
  await waitState(cdp, '#resize-image-tool', 'ready');
  await evalValue(cdp, `(() => { const lock=document.querySelector('#resize-lock'); lock.checked=false; lock.dispatchEvent(new Event('change',{bubbles:true})); const w=document.querySelector('#resize-width'); const h=document.querySelector('#resize-height'); w.value='320'; h.value='180'; w.dispatchEvent(new Event('input',{bubbles:true})); h.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);

  // Real anchor navigation: Resize -> Crop. Image must already be ready there.
  await evalValue(cdp, `document.querySelector('a[href="/tools/crop-image/"]').click(); true`);
  const cropSeo = await waitPath(cdp, '/tools/crop-image/');
  await waitState(cdp, '#crop-image-tool', 'ready');
  const cropMeta = await evalValue(cdp, `({meta:document.querySelector('#crop-file-meta')?.textContent||'', active:document.querySelector('.image-workspace-tab.is-active')?.textContent?.trim()||'', nav:performance.getEntriesByType('navigation').length})`);
  if (!cropMeta.meta.includes('640 × 480') || cropMeta.active !== 'Crop' || cropMeta.nav !== navigationCount) throw new Error(`Resize -> Crop did not preserve one workspace: ${JSON.stringify(cropMeta)}`);
  if (!cropSeo.title.startsWith('Crop Image Online') || !cropSeo.canonical.endsWith('/tools/crop-image/')) throw new Error(`Crop SEO head did not change with route: ${JSON.stringify(cropSeo)}`);

  // Save Crop state, execute and validate result.
  await evalValue(cdp, `(() => { const p=document.querySelector('#crop-preset'); p.value='1'; p.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
  const cropSaved = await evalValue(cdp, `({w:+document.querySelector('#crop-width').value,h:+document.querySelector('#crop-height').value})`);
  if (cropSaved.w !== cropSaved.h) throw new Error(`Crop 1:1 state failed: ${JSON.stringify(cropSaved)}`);
  await evalValue(cdp, `document.querySelector('#crop-action').click(); true`);
  await waitState(cdp, '#crop-image-tool', 'success');
  const cropPreview = await waitImage(cdp, '#crop-result-image');
  const cropFile = await download(cdp, '#crop-download');
  const cropDownloaded = await decodeJpegDimensions(path.join(DOWNLOADS, cropFile));
  if (cropDownloaded.width !== cropDownloaded.height) throw new Error(`Crop download is not square: ${JSON.stringify(cropDownloaded)}`);

  // Crop -> Resize. Same image + previous Resize controls must come back.
  await evalValue(cdp, `document.querySelector('a[href="/tools/resize-image/"]').click(); true`);
  const resizeSeo = await waitPath(cdp, '/tools/resize-image/');
  await waitState(cdp, '#resize-image-tool', 'ready');
  const restoredResize = await evalValue(cdp, `({w:+document.querySelector('#resize-width').value,h:+document.querySelector('#resize-height').value,lock:document.querySelector('#resize-lock').checked,meta:document.querySelector('#resize-file-meta')?.textContent||'',active:document.querySelector('.image-workspace-tab.is-active')?.textContent?.trim()||'',nav:performance.getEntriesByType('navigation').length})`);
  if (restoredResize.w !== 320 || restoredResize.h !== 180 || restoredResize.lock !== false || !restoredResize.meta.includes('640 × 480') || restoredResize.active !== 'Resize' || restoredResize.nav !== navigationCount) {
    throw new Error(`Crop -> Resize state restore failed: ${JSON.stringify(restoredResize)}`);
  }
  if (!resizeSeo.title.startsWith('Resize Image Online') || !resizeSeo.canonical.endsWith('/tools/resize-image/')) throw new Error(`Resize SEO head did not restore: ${JSON.stringify(resizeSeo)}`);

  await evalValue(cdp, `document.querySelector('#resize-action').click(); true`);
  await waitState(cdp, '#resize-image-tool', 'success');
  const resizePreview = await waitImage(cdp, '#resize-result-image');
  const resizeFile = await download(cdp, '#resize-download');
  const resizeDownloaded = await decodeJpegDimensions(path.join(DOWNLOADS, resizeFile));
  if (resizeDownloaded.width !== 320 || resizeDownloaded.height !== 180) throw new Error(`Resize download wrong: ${JSON.stringify(resizeDownloaded)}`);

  // Second file on the same browser document, then another tool switch without reload.
  await upload(cdp, '#resize-file', secondPath);
  await waitState(cdp, '#resize-image-tool', 'ready');
  await evalValue(cdp, `document.querySelector('a[href="/tools/crop-image/"]').click(); true`);
  await waitPath(cdp, '/tools/crop-image/');
  await waitState(cdp, '#crop-image-tool', 'ready');
  const secondMeta = await evalValue(cdp, `({meta:document.querySelector('#crop-file-meta')?.textContent||'', nav:performance.getEntriesByType('navigation').length, w:+document.querySelector('#crop-width').value,h:+document.querySelector('#crop-height').value})`);
  if (!secondMeta.meta.includes('300 × 200') || secondMeta.nav !== navigationCount || secondMeta.w === cropSaved.w) throw new Error(`Second file did not replace workspace cleanly: ${JSON.stringify(secondMeta)}`);

  // Mobile layout after client navigation.
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const mobile = await evalValue(cdp, `({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,tabs:document.querySelector('.image-workspace-tabs')?.getBoundingClientRect().width||0})`);
  if (mobile.scroll > mobile.client + 1) throw new Error(`Mobile horizontal overflow: ${JSON.stringify(mobile)}`);

  // No image payload may leave the browser. Only tiny first-party analytics POSTs are allowed.
  const suspicious = requests.filter((request) => request.method !== 'GET' && request.path !== '/api/collect');
  const oversizedAnalytics = requests.filter((request) => request.path === '/api/collect' && request.bytes > 20000);
  if (suspicious.length || oversizedAnalytics.length) throw new Error(`Unexpected network request: ${JSON.stringify({ suspicious, oversizedAnalytics })}`);

  await screenshot(cdp, 'workspace-crop-second-file-mobile.png');
  report.workspace = {
    status: 'PASS',
    oneDocumentNavigation: navigationCount === 1,
    resizeToCrop: cropMeta,
    cropToResize: restoredResize,
    seoHeadsChanged: true,
    secondFileWithoutReload: secondMeta,
  };
  report.output = { cropPreview, cropDownloaded, resizePreview, resizeDownloaded };
  report.mobile = { status: 'PASS', ...mobile };
  report.network = { status: 'PASS', requests: requests.length, suspicious: 0 };
  report.result = 'PASS';
  report.finishedAt = new Date().toISOString();
  console.log(`IMAGE WORKSPACE SMOKE PASS — Resize→Crop→Resize keeps one image/state; real SEO URLs/head swap; Crop ${cropDownloaded.width}x${cropDownloaded.height}; Resize ${resizeDownloaded.width}x${resizeDownloaded.height}; second file without reload; mobile/network PASS`);
} catch (error) {
  report.result = 'FAIL';
  report.error = String(error?.stack || error);
  report.chromeStderr = chromeStderr.slice(-10000);
  report.finishedAt = new Date().toISOString();
  throw error;
} finally {
  await fs.writeFile(path.join(EVIDENCE, 'workspace-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8').catch(() => {});
  cdp.close();
  chromeProc.kill('SIGTERM');
  await new Promise((resolve) => server.close(resolve));
}
