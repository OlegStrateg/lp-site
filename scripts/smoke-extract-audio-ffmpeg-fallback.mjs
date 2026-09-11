import fs from 'node:fs/promises';
import fssync from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

const DIST = path.resolve('dist');
const EVIDENCE = path.resolve('artifacts/extract-audio-ffmpeg-fallback');
const WORK = await fs.mkdtemp(path.join(os.tmpdir(), 'lp-eav-ffmpeg-'));
await fs.mkdir(EVIDENCE, { recursive: true });

function sh(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} failed\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function findExecutable(names) {
  for (const name of names) {
    const result = spawnSync('bash', ['-lc', `command -v ${name}`], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error(`Executable not found: ${names.join(', ')}`);
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

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

const ffmpeg = findExecutable(['ffmpeg']);
const ffprobe = findExecutable(['ffprobe']);
const chrome = findExecutable(['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']);
const firstVideo = path.join(WORK, 'first.mp4');
const secondVideo = path.join(WORK, 'second.mp4');

sh(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:d=2', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=2', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', firstVideo]);
sh(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:d=1.5', '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=48000:duration=1.5', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', secondVideo]);

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'], ['.mp4', 'video/mp4'], ['.css', 'text/css; charset=utf-8'], ['.png', 'image/png'],
]);
const requests = [];
const port = await freePort();

const smokeHtml = `<!doctype html><meta charset="utf-8"><title>FFmpeg fallback smoke</title><pre id="status">starting</pre><script>
window.__smoke = { state: 'starting', messages: [], results: [] };
const status = document.querySelector('#status');
const worker = new Worker('/tools/extract-audio-from-video/processor.js?engine=ffmpeg&smoke=' + Date.now());
let current = 0;
const fixtures = ['/__fixture-1.mp4', '/__fixture-2.mp4'];
let file = null;
let id = '';
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer); let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
async function startFixture(index) {
  current = index; id = 'fixture-' + index + '-' + Date.now();
  const response = await fetch(fixtures[index], { cache: 'no-store' });
  file = new File([await response.blob()], 'fixture-' + index + '.mp4', { type: 'video/mp4' });
  worker.postMessage({ type: 'probe', id, file });
}
worker.onerror = (event) => { window.__smoke = { ...window.__smoke, state: 'error', error: event.message || 'worker error' }; status.textContent = JSON.stringify(window.__smoke); };
worker.onmessage = async (event) => {
  const m = event.data || {}; window.__smoke.messages.push({ type: m.type, id: m.id || null, engine: m.engine || null, error: m.error || null });
  if (m.type === 'ready') { window.__smoke.state = 'ready'; await startFixture(0); return; }
  if (m.id !== id) return;
  if (m.type === 'probe-result') {
    if (!m.hasAudio || m.engine !== 'ffmpeg') { window.__smoke.state = 'error'; window.__smoke.error = 'bad probe ' + JSON.stringify(m); return; }
    worker.postMessage({ type: 'process', id, file, bitrate: 320000 }); return;
  }
  if (m.type === 'result') {
    if (!(m.buffer instanceof ArrayBuffer) || !m.buffer.byteLength || m.engine !== 'ffmpeg') { window.__smoke.state = 'error'; window.__smoke.error = 'bad result'; return; }
    window.__smoke.results.push({ index: current, bytes: m.buffer.byteLength, base64: toBase64(m.buffer) });
    if (current === 0) { await startFixture(1); } else { window.__smoke.state = 'success'; worker.terminate(); }
    return;
  }
  if (m.type === 'error') { window.__smoke.state = 'error'; window.__smoke.error = m.error || 'worker message error'; }
  status.textContent = JSON.stringify(window.__smoke);
};
</script>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  requests.push({ method: req.method, path: url.pathname, query: url.search });
  let filePath = '';
  if (url.pathname === '/__smoke.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(smokeHtml); return;
  }
  if (url.pathname === '/__fixture-1.mp4') filePath = firstVideo;
  else if (url.pathname === '/__fixture-2.mp4') filePath = secondVideo;
  else {
    const clean = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    filePath = path.join(DIST, clean || 'index.html');
  }
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', mime.get(ext) || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    if (url.pathname === '/tools/extract-audio-from-video/processor.js') {
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    }
    res.end(data);
  } catch {
    res.statusCode = 404; res.end('not found');
  }
});
await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

const debugPort = await freePort();
const chromeProc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-allow-origins=*', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${path.join(WORK, 'chrome')}`, 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
let chromeStderr = '';
chromeProc.stderr.on('data', (chunk) => { chromeStderr += chunk.toString(); });

class Cdp {
  constructor(url) { this.ws = new WebSocket(url); this.id = 1; this.pending = new Map(); this.events = []; }
  async open() {
    await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id) { const p = this.pending.get(msg.id); if (!p) return; this.pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result || {}); }
      else this.events.push(msg);
    });
  }
  send(method, params = {}) { const id = this.id++; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  close() { try { this.ws.close(); } catch {} }
}

async function waitJson(url, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { try { const r = await fetch(url); if (r.ok) return r.json(); } catch {} await delay(200); }
  throw new Error(`Chrome debugging endpoint timeout: ${url}`);
}

const report = { startedAt: new Date().toISOString(), port, chrome, ffmpeg, ffprobe, requests, result: null, probes: [] };
let cdp;
try {
  await waitJson(`http://127.0.0.1:${debugPort}/json/version`);
  const tabResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`http://127.0.0.1:${port}/__smoke.html`)}`, { method: 'PUT' });
  const tab = await tabResponse.json();
  cdp = new Cdp(tab.webSocketDebuggerUrl); await cdp.open();
  await cdp.send('Runtime.enable'); await cdp.send('Log.enable');

  const deadline = Date.now() + 120000;
  let state = null;
  while (Date.now() < deadline) {
    const result = await cdp.send('Runtime.evaluate', { expression: 'window.__smoke || null', returnByValue: true });
    state = result.result?.value || null;
    if (state?.state === 'success' || state?.state === 'error') break;
    await delay(250);
  }
  if (!state || state.state !== 'success') throw new Error(`Forced FFmpeg browser path failed: ${JSON.stringify(state)}`);
  if (!Array.isArray(state.results) || state.results.length !== 2) throw new Error(`Expected two FFmpeg results: ${JSON.stringify(state)}`);

  for (const item of state.results) {
    const output = path.join(WORK, `result-${item.index + 1}.mp3`);
    await fs.writeFile(output, Buffer.from(item.base64, 'base64'));
    const info = JSON.parse(sh(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,codec_type,bit_rate', '-of', 'json', output]));
    const audio = (info.streams || []).find((stream) => stream.codec_type === 'audio');
    const duration = Number(info.format?.duration || 0);
    if (audio?.codec_name !== 'mp3' || duration <= 0.5) throw new Error(`Invalid result ${item.index}: ${JSON.stringify(info)}`);
    report.probes.push({ index: item.index, bytes: item.bytes, codec: audio.codec_name, bitrate: Number(audio.bit_rate || 0), duration });
  }

  const required = ['ffmpeg-core.js', 'ffmpeg-core.manifest.json', 'ffmpeg-core.wasm.part-01', 'ffmpeg-core.wasm.part-02'];
  for (const token of required) {
    if (!requests.some((request) => request.path.includes(token))) throw new Error(`Fallback runtime request missing: ${token}`);
  }
  if (requests.some((request) => /^https?:\/\//.test(request.path))) throw new Error('Unexpected external runtime request recorded');

  const consoleErrors = cdp.events.filter((event) => ['Runtime.exceptionThrown', 'Log.entryAdded'].includes(event.method) && JSON.stringify(event).toLowerCase().includes('error'));
  if (consoleErrors.length) throw new Error(`Browser console errors: ${JSON.stringify(consoleErrors.slice(0, 5))}`);
  report.result = 'PASS'; report.finishedAt = new Date().toISOString();
  console.log(`FFMPEG FALLBACK BROWSER SMOKE PASS — first ${report.probes[0].duration}s, second ${report.probes[1].duration}s`);
} catch (error) {
  report.result = 'FAIL'; report.error = String(error?.stack || error); report.chromeStderr = chromeStderr.slice(-10000); report.finishedAt = new Date().toISOString();
  throw error;
} finally {
  try { await fs.writeFile(path.join(EVIDENCE, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8'); } catch {}
  cdp?.close(); chromeProc.kill('SIGTERM'); server.close();
}
