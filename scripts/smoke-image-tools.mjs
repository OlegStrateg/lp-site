import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import jpeg from 'jpeg-js';

const DIST = path.resolve('dist');
const WORK = await fs.mkdtemp(path.join(os.tmpdir(), 'lp-image-tools-'));
const DOWNLOADS = path.join(WORK, 'downloads');
const EVIDENCE = path.resolve('artifacts/image-tools');
await fs.mkdir(DOWNLOADS, { recursive: true });
await fs.mkdir(EVIDENCE, { recursive: true });

function findExecutable(names) {
  for (const name of names) {
    const result = spawnSync('bash', ['-lc', `command -v ${name}`], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
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
    } catch (error) {
      last = String(error?.message || error);
    }
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

const firstPath = path.join(WORK, 'first-640x480.jpg');
const secondPath = path.join(WORK, 'second-300x200.jpg');
await fs.writeFile(firstPath, makeJpeg(640, 480, 17));
await fs.writeFile(secondPath, makeJpeg(300, 200, 41));

const mime = new Map([
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
  requests.push({ method: req.method, path: url.pathname, contentType: req.headers['content-type'] || '', bytes: body.length, body: body.toString('utf8').slice(0, 1000) });

  if (url.pathname === '/api/collect') {
    res.statusCode = 204;
    res.end();
    return;
  }

  let filePath = path.join(DIST, decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html');
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    const data = await fs.readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', mime.get(path.extname(filePath)) || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
});
await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 1;
    this.pending = new Map();
    this.events = [];
  }
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
      } else {
        this.events.push(message);
      }
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

async function waitChrome(url) {
  return waitFor(async () => {
    try {
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    } catch { return null; }
  }, 20000, 'Chrome remote debugging');
}

const chrome = findExecutable(['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']);
const debugPort = await freePort();
const chromeProc = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-allow-origins=*',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${path.join(WORK, 'chrome-profile')}`, 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
let chromeStderr = '';
chromeProc.stderr.on('data', (chunk) => { chromeStderr += chunk.toString(); });
await waitChrome(`http://127.0.0.1:${debugPort}/json/version`);

async function openPage(relativePath) {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`http://127.0.0.1:${port}${relativePath}`)}`, { method: 'PUT' });
  const tab = await response.json();
  const cdp = new Cdp(tab.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS, eventsEnabled: true });
  await waitFor(async () => {
    const value = await evaluate(cdp, `document.readyState === 'complete'`);
    return value === true;
  }, 20000, `page ${relativePath}`);
  return cdp;
}

async function evaluate(cdp, expression, awaitPromise = false) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (result.exceptionDetails) throw new Error(`Browser evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  return result.result?.value;
}

async function upload(cdp, selector, filePath) {
  const doc = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const node = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
  if (!node.nodeId) throw new Error(`File input not found: ${selector}`);
  await cdp.send('DOM.setFileInputFiles', { files: [filePath], nodeId: node.nodeId });
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('change',{bubbles:true})); true`);
}

async function waitState(cdp, rootSelector, state) {
  return waitFor(async () => {
    const current = await evaluate(cdp, `document.querySelector(${JSON.stringify(rootSelector)})?.dataset?.state || ''`);
    if (current === 'error') throw new Error(`Tool entered error state: ${rootSelector}`);
    return current === state ? current : null;
  }, 30000, `${rootSelector} state=${state}`);
}

async function waitImage(cdp, selector) {
  return waitFor(async () => {
    const value = await evaluate(cdp, `(() => { const img=document.querySelector(${JSON.stringify(selector)}); return img && img.complete ? {w:img.naturalWidth,h:img.naturalHeight} : null; })()`);
    return value?.w > 0 && value?.h > 0 ? value : null;
  }, 20000, `image ${selector}`);
}

async function clickDownload(cdp, selector) {
  const before = new Set(await fs.readdir(DOWNLOADS));
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).click(); true`);
  return waitFor(async () => {
    const names = await fs.readdir(DOWNLOADS);
    return names.find((name) => !before.has(name) && !name.endsWith('.crdownload')) || null;
  }, 20000, `download ${selector}`);
}

async function screenshot(cdp, filename) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await fs.writeFile(path.join(EVIDENCE, filename), Buffer.from(shot.data, 'base64'));
}

function decodeJpegDimensions(filePath) {
  return fs.readFile(filePath).then((buffer) => {
    const decoded = jpeg.decode(buffer, { useTArray: true });
    return { width: decoded.width, height: decoded.height };
  });
}

const report = { startedAt: new Date().toISOString(), chrome, resize: {}, crop: {}, mobile: {}, requests, result: null };
let resizeCdp;
let cropCdp;
let mobileCdp;
try {
  resizeCdp = await openPage('/tools/resize-image/');
  const resizeNavCount = await evaluate(resizeCdp, `performance.getEntriesByType('navigation').length`);
  await upload(resizeCdp, '#resize-file', firstPath);
  await waitState(resizeCdp, '#resize-image-tool', 'ready');
  await evaluate(resizeCdp, `(() => { const lock=document.querySelector('#resize-lock'); lock.checked=false; lock.dispatchEvent(new Event('change',{bubbles:true})); const w=document.querySelector('#resize-width'); const h=document.querySelector('#resize-height'); w.value='320'; h.value='180'; w.dispatchEvent(new Event('input',{bubbles:true})); h.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#resize-action').click(); return true; })()`);
  await waitState(resizeCdp, '#resize-image-tool', 'success');
  const resizePreview = await waitImage(resizeCdp, '#resize-result-image');
  if (resizePreview.w !== 320 || resizePreview.h !== 180) throw new Error(`Resize preview wrong: ${JSON.stringify(resizePreview)}`);
  const resizeDownloaded = await clickDownload(resizeCdp, '#resize-download');
  const resizeDecoded = await decodeJpegDimensions(path.join(DOWNLOADS, resizeDownloaded));
  if (resizeDecoded.width !== 320 || resizeDecoded.height !== 180) throw new Error(`Resize download wrong: ${JSON.stringify(resizeDecoded)}`);

  await upload(resizeCdp, '#resize-file', secondPath);
  await waitState(resizeCdp, '#resize-image-tool', 'ready');
  await evaluate(resizeCdp, `(() => { const lock=document.querySelector('#resize-lock'); lock.checked=false; const w=document.querySelector('#resize-width'); const h=document.querySelector('#resize-height'); w.value='150'; h.value='100'; w.dispatchEvent(new Event('input',{bubbles:true})); h.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#resize-action').click(); return true; })()`);
  await waitState(resizeCdp, '#resize-image-tool', 'success');
  const resizeSecond = await waitImage(resizeCdp, '#resize-result-image');
  const resizeNavAfter = await evaluate(resizeCdp, `performance.getEntriesByType('navigation').length`);
  if (resizeSecond.w !== 150 || resizeSecond.h !== 100 || resizeNavAfter !== resizeNavCount) throw new Error(`Resize repeat flow failed: ${JSON.stringify({ resizeSecond, resizeNavCount, resizeNavAfter })}`);
  await screenshot(resizeCdp, 'resize-success.png');
  report.resize = { status: 'PASS', firstOutput: resizeDecoded, secondOutput: resizeSecond, withoutReload: resizeNavAfter === resizeNavCount };

  cropCdp = await openPage('/tools/crop-image/');
  const cropNavCount = await evaluate(cropCdp, `performance.getEntriesByType('navigation').length`);
  await upload(cropCdp, '#crop-file', firstPath);
  await waitState(cropCdp, '#crop-image-tool', 'ready');
  await evaluate(cropCdp, `(() => { const values={ '#crop-x':'50','#crop-y':'40','#crop-width':'200','#crop-height':'120' }; for (const [selector,value] of Object.entries(values)) document.querySelector(selector).value=value; document.querySelector('#crop-height').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#crop-action').click(); return true; })()`);
  await waitState(cropCdp, '#crop-image-tool', 'success');
  const cropPreview = await waitImage(cropCdp, '#crop-result-image');
  if (cropPreview.w !== 200 || cropPreview.h !== 120) throw new Error(`Crop preview wrong: ${JSON.stringify(cropPreview)}`);
  const cropDownloaded = await clickDownload(cropCdp, '#crop-download');
  const cropDecoded = await decodeJpegDimensions(path.join(DOWNLOADS, cropDownloaded));
  if (cropDecoded.width !== 200 || cropDecoded.height !== 120) throw new Error(`Crop download wrong: ${JSON.stringify(cropDecoded)}`);

  await upload(cropCdp, '#crop-file', secondPath);
  await waitState(cropCdp, '#crop-image-tool', 'ready');
  await evaluate(cropCdp, `(() => { document.querySelector('#crop-preset').value='1'; document.querySelector('#crop-preset').dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#crop-action').click(); return true; })()`);
  await waitState(cropCdp, '#crop-image-tool', 'success');
  const cropSecond = await waitImage(cropCdp, '#crop-result-image');
  const cropNavAfter = await evaluate(cropCdp, `performance.getEntriesByType('navigation').length`);
  if (cropSecond.w !== cropSecond.h || cropNavAfter !== cropNavCount) throw new Error(`Crop repeat/preset flow failed: ${JSON.stringify({ cropSecond, cropNavCount, cropNavAfter })}`);
  await screenshot(cropCdp, 'crop-success.png');
  report.crop = { status: 'PASS', firstOutput: cropDecoded, secondOutput: cropSecond, preset11: cropSecond.w === cropSecond.h, withoutReload: cropNavAfter === cropNavCount };

  mobileCdp = await openPage('/tools/crop-image/');
  await mobileCdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await mobileCdp.send('Page.reload', { ignoreCache: true });
  await waitFor(async () => await evaluate(mobileCdp, `document.readyState === 'complete'`), 20000, 'mobile page reload');
  const mobileMetrics = await evaluate(mobileCdp, `({innerWidth:window.innerWidth, scrollWidth:document.documentElement.scrollWidth})`);
  if (mobileMetrics.scrollWidth > mobileMetrics.innerWidth + 1) throw new Error(`Mobile horizontal overflow: ${JSON.stringify(mobileMetrics)}`);
  await screenshot(mobileCdp, 'crop-mobile-390x844.png');
  report.mobile = { status: 'PASS', ...mobileMetrics };

  const suspiciousUploads = requests.filter((request) => request.method !== 'GET' && request.path !== '/api/collect');
  if (suspiciousUploads.length) throw new Error(`Unexpected non-analytics request: ${JSON.stringify(suspiciousUploads)}`);
  for (const request of requests.filter((item) => item.path === '/api/collect')) {
    if (/multipart\/form-data|application\/octet-stream/i.test(request.contentType)) throw new Error(`Analytics attempted binary upload: ${JSON.stringify(request)}`);
    if (/first-640x480|second-300x200/i.test(request.body)) throw new Error(`Analytics leaked fixture filename: ${request.body}`);
  }

  const browserErrors = [...(resizeCdp.events || []), ...(cropCdp.events || []), ...(mobileCdp.events || [])]
    .filter((event) => event.method === 'Runtime.exceptionThrown' || (event.method === 'Log.entryAdded' && event.params?.entry?.level === 'error'));
  if (browserErrors.length) throw new Error(`Browser console/runtime errors: ${JSON.stringify(browserErrors.slice(0, 5))}`);

  report.result = 'PASS';
  report.finishedAt = new Date().toISOString();
  console.log('IMAGE TOOLS BROWSER SMOKE PASS — resize exact pixels + crop exact pixels + repeat without reload + mobile');
} catch (error) {
  report.result = 'FAIL';
  report.error = String(error?.stack || error);
  report.chromeStderr = chromeStderr.slice(-10000);
  report.finishedAt = new Date().toISOString();
  throw error;
} finally {
  try { await fs.writeFile(path.join(EVIDENCE, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8'); } catch {}
  resizeCdp?.close();
  cropCdp?.close();
  mobileCdp?.close();
  chromeProc.kill('SIGTERM');
  server.close();
}
