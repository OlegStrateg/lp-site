import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import jpeg from 'jpeg-js';

const DIST = path.resolve('dist');
const WORK = await fs.mkdtemp(path.join(os.tmpdir(), 'lp-meme-editor-'));
const IMAGE = path.join(WORK, 'meme-source-640x480.jpg');

function makeJpeg(width, height) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = (x * 2) % 256;
      data[i + 1] = (y * 3) % 256;
      data[i + 2] = (x + y) % 256;
      data[i + 3] = 255;
    }
  }
  return Buffer.from(jpeg.encode({ data, width, height }, 88).data);
}
await fs.writeFile(IMAGE, makeJpeg(640, 480));

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
  requests.push({ method: req.method, path: url.pathname, bytes: body.length });
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
  constructor(url) { this.ws = new WebSocket(url); this.id = 1; this.pending = new Map(); }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result || {});
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
    const state = await evalValue(cdp, `document.querySelector(${JSON.stringify(selector)})?.dataset?.state || ''`);
    if (state === 'error') throw new Error(`${selector} entered error state`);
    return state === expected ? state : null;
  }, 30000, `${selector} state=${expected}`);
}
async function waitPath(cdp, pathname) {
  return waitFor(async () => {
    const value = await evalValue(cdp, `({path:location.pathname,ready:document.readyState})`);
    return value?.path === pathname && value.ready === 'complete' ? value : null;
  }, 30000, `path ${pathname}`);
}

const chrome = findExecutable(['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']);
const debugPort = await freePort();
const chromeProc = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-allow-origins=*',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${path.join(WORK, 'chrome-profile')}`, 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

await waitFor(async () => {
  try { return (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).ok; } catch { return false; }
}, 20000, 'Chrome');

const tabResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`http://127.0.0.1:${port}/tools/meme-generator/`)}`, { method: 'PUT' });
const tab = await tabResponse.json();
const cdp = new Cdp(tab.webSocketDebuggerUrl);
await cdp.open();
await cdp.send('Runtime.enable');
await cdp.send('Page.enable');
await cdp.send('DOM.enable');

try {
  await waitPath(cdp, '/tools/meme-generator/');
  await upload(cdp, '#meme-file', IMAGE);
  await waitState(cdp, '#meme-image-tool', 'ready');

  const initial = await evalValue(cdp, `(() => ({
    objects: document.querySelectorAll('[data-meme-layer]').length,
    selected: !!document.querySelector('.meme-object.is-selected'),
    toolbarVisible: !document.querySelector('#meme-floating-toolbar')?.hidden,
    stageW: document.querySelector('#meme-stage')?.getBoundingClientRect().width || 0,
    stageH: document.querySelector('#meme-stage')?.getBoundingClientRect().height || 0
  }))()`);
  if (initial.objects !== 2 || !initial.selected || !initial.toolbarVisible || initial.stageW < 300 || initial.stageH < 200) {
    throw new Error(`Initial WYSIWYG state failed: ${JSON.stringify(initial)}`);
  }

  await evalValue(cdp, `document.querySelector('#meme-add-text').click(); true`);
  const afterAdd = await evalValue(cdp, `document.querySelectorAll('[data-meme-layer]').length`);
  if (afterAdd !== 3) throw new Error(`Add text failed: ${afterAdd}`);

  await evalValue(cdp, `(() => {
    const selected = document.querySelector('.meme-object.is-selected');
    selected.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,clientX:selected.getBoundingClientRect().x+10,clientY:selected.getBoundingClientRect().y+10}));
    const text = selected.querySelector('[data-role="text"]');
    text.innerText = 'DIRECT EDIT';
    text.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'DIRECT EDIT'}));
    return {editable:text.contentEditable,text:text.innerText};
  })()`);
  const edited = await evalValue(cdp, `(() => { const text=document.querySelector('.meme-object.is-selected [data-role="text"]'); return {editable:text?.contentEditable,text:text?.innerText}; })()`);
  if (edited.editable !== 'true' || edited.text !== 'DIRECT EDIT') throw new Error(`Direct editing failed: ${JSON.stringify(edited)}`);

  await evalValue(cdp, `document.querySelector('#meme-mode-outside').click(); true`);
  const outside = await evalValue(cdp, `(() => {
    const stage=document.querySelector('#meme-stage');
    const image=document.querySelector('#meme-stage-image');
    return {outside:stage.classList.contains('is-outside'),stageH:stage.getBoundingClientRect().height,imageH:image.getBoundingClientRect().height};
  })()`);
  if (!outside.outside || outside.stageH <= outside.imageH) throw new Error(`Text outside mode failed: ${JSON.stringify(outside)}`);

  const moved = await evalValue(cdp, `(() => {
    const object=document.querySelector('.meme-object.is-selected');
    const layer=document.querySelector('#meme-object-layer');
    const r=object.getBoundingClientRect();
    const before={left:parseFloat(object.style.left),top:parseFloat(object.style.top)};
    const pointerId=17;
    object.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId,clientX:r.left+r.width/2,clientY:r.top+r.height/2,buttons:1}));
    layer.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId,clientX:r.left+r.width/2+45,clientY:r.top+r.height/2+35,buttons:1}));
    layer.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId,clientX:r.left+r.width/2+45,clientY:r.top+r.height/2+35}));
    return new Promise(resolve => requestAnimationFrame(() => resolve({before,after:{left:parseFloat(object.style.left),top:parseFloat(object.style.top)}})));
  })()`, true);
  if (Math.abs(moved.after.left - moved.before.left) < 5 && Math.abs(moved.after.top - moved.before.top) < 5) {
    throw new Error(`Drag failed: ${JSON.stringify(moved)}`);
  }

  await evalValue(cdp, `document.querySelector('#meme-action').click(); true`);
  await waitState(cdp, '#meme-image-tool', 'success');
  const applied = await evalValue(cdp, `document.querySelector('#meme-file-meta')?.textContent || ''`);
  if (!/640 × [5-9][0-9]{2} px/.test(applied)) throw new Error(`Outside output dimensions not applied: ${applied}`);

  await evalValue(cdp, `document.querySelector('a[href="/tools/crop-image/"]').click(); true`);
  await waitPath(cdp, '/tools/crop-image/');
  await waitState(cdp, '#crop-image-tool', 'ready');
  const cropMeta = await evalValue(cdp, `document.querySelector('#crop-file-meta')?.textContent || ''`);
  if (!cropMeta.startsWith('640 × ')) throw new Error(`Meme → Crop Workspace handoff failed: ${cropMeta}`);

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evalValue(cdp, `document.querySelector('a[href="/tools/meme-generator/"]').click(); true`);
  await waitPath(cdp, '/tools/meme-generator/');
  await waitState(cdp, '#meme-image-tool', 'ready');
  const mobile = await evalValue(cdp, `({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})`);
  if (mobile.scroll > mobile.client + 1) throw new Error(`Meme mobile overflow: ${JSON.stringify(mobile)}`);

  const suspicious = requests.filter((request) => request.method !== 'GET' && request.path !== '/api/collect');
  if (suspicious.length) throw new Error(`Unexpected image network upload: ${JSON.stringify(suspicious)}`);

  console.log(`MEME EDITOR SMOKE PASS — direct edit, add text, outside mode, drag, Apply→Crop, mobile and local-only processing PASS`);
} finally {
  cdp.close();
  chromeProc.kill('SIGTERM');
  await new Promise((resolve) => server.close(resolve));
}
