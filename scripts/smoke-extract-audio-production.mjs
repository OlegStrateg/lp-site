import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

const TARGET = process.env.EXTRACT_AUDIO_URL || 'https://layerporter.com/tools/extract-audio-from-video/';
const artifactsDir = path.resolve('artifacts/extract-audio-production-smoke');
const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lp-eav-smoke-'));
const downloadsDir = path.join(workDir, 'downloads');
await fs.mkdir(artifactsDir, { recursive: true });
await fs.mkdir(downloadsDir, { recursive: true });

function sh(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return result.stdout.trim();
}

function findExecutable(names) {
  for (const name of names) {
    const result = spawnSync('bash', ['-lc', `command -v ${name}`], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error(`Executable not found: ${names.join(', ')}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
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

const firstVideo = path.join(workDir, 'first.mp4');
const secondVideo = path.join(workDir, 'second.mp4');

sh(ffmpeg, [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'lavfi', '-i', 'color=c=black:s=320x180:d=2',
  '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=2',
  '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', firstVideo,
]);
sh(ffmpeg, [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:d=1.5',
  '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=48000:duration=1.5',
  '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', secondVideo,
]);

const port = await getFreePort();
const userDataDir = path.join(workDir, 'chrome-profile');
const chromeProc = spawn(chrome, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required',
  '--remote-allow-origins=*',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

let chromeStderr = '';
chromeProc.stderr.on('data', (chunk) => { chromeStderr += chunk.toString(); });

async function waitForJson(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'unknown error'}`);
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
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
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result || {});
        return;
      }
      const callbacks = this.listeners.get(message.method) || [];
      for (const callback of callbacks) callback(message.params || {});
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, callback) {
    const list = this.listeners.get(method) || [];
    list.push(callback);
    this.listeners.set(method, list);
  }
  waitFor(method, predicate = () => true, timeoutMs = 20_000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timed out waiting for CDP event ${method}`)), timeoutMs);
      const handler = (params) => {
        if (!predicate(params)) return;
        clearTimeout(timeout);
        const list = this.listeners.get(method) || [];
        this.listeners.set(method, list.filter((item) => item !== handler));
        resolve(params);
      };
      this.on(method, handler);
    });
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

async function evaluate(cdp, expression, awaitPromise = true) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) throw new Error(`Runtime.evaluate failed: ${result.exceptionDetails.text}`);
  return result.result?.value;
}

async function waitForState(cdp, allowed, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await evaluate(cdp, `(() => {
      const root = document.querySelector('#extract-audio-tool');
      const status = document.querySelector('#eav-status');
      return { state: root?.dataset?.state || null, status: status?.textContent || '' };
    })()`);
    if (allowed.includes(last?.state)) return last;
    await delay(250);
  }
  throw new Error(`Timed out waiting for states ${allowed.join(', ')}; last=${JSON.stringify(last)}`);
}

async function selectFile(cdp, filePath) {
  const doc = await cdp.send('DOM.getDocument', { depth: 2, pierce: true });
  const query = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#eav-file' });
  if (!query.nodeId) throw new Error('File input #eav-file not found');
  await cdp.send('DOM.setFileInputFiles', { nodeId: query.nodeId, files: [filePath] });
  await evaluate(cdp, `document.querySelector('#eav-file').dispatchEvent(new Event('change', { bubbles: true }))`);
}

async function capture(cdp, name) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await fs.writeFile(path.join(artifactsDir, name), Buffer.from(shot.data, 'base64'));
}

async function waitForDownload(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const files = await fs.readdir(downloadsDir);
    const mp3 = files.find((name) => name.endsWith('.mp3'));
    const partial = files.some((name) => name.endsWith('.crdownload'));
    if (mp3 && !partial) return path.join(downloadsDir, mp3);
    await delay(250);
  }
  throw new Error('Timed out waiting for MP3 download');
}

const report = {
  target: TARGET,
  startedAt: new Date().toISOString(),
  chrome,
  ffmpeg,
  ffprobe,
  requests: [],
  failedRequests: [],
  console: [],
  steps: [],
};

let cdp;
try {
  await waitForJson(`http://127.0.0.1:${port}/json/version`);
  const newTabResponse = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (!newTabResponse.ok) throw new Error(`Could not create Chrome tab: HTTP ${newTabResponse.status}`);
  const tab = await newTabResponse.json();
  cdp = new Cdp(tab.webSocketDebuggerUrl);
  await cdp.open();
  await Promise.all([
    cdp.send('Page.enable'),
    cdp.send('DOM.enable'),
    cdp.send('Runtime.enable'),
    cdp.send('Network.enable'),
    cdp.send('Log.enable'),
  ]);
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadsDir, eventsEnabled: true });

  const responseStatusById = new Map();
  cdp.on('Network.requestWillBeSent', (event) => {
    const { requestId, request } = event;
    report.requests.push({
      requestId,
      method: request.method,
      url: request.url,
      hasPostData: Boolean(request.hasPostData),
      postDataLength: request.postData ? request.postData.length : 0,
    });
  });
  cdp.on('Network.responseReceived', (event) => {
    responseStatusById.set(event.requestId, event.response.status);
    const item = report.requests.find((entry) => entry.requestId === event.requestId);
    if (item) {
      item.status = event.response.status;
      item.mimeType = event.response.mimeType;
      item.fromDiskCache = event.response.fromDiskCache;
      item.fromServiceWorker = event.response.fromServiceWorker;
    }
  });
  cdp.on('Network.loadingFailed', (event) => {
    report.failedRequests.push({ requestId: event.requestId, errorText: event.errorText, blockedReason: event.blockedReason || null, corsErrorStatus: event.corsErrorStatus || null });
  });
  cdp.on('Runtime.exceptionThrown', (event) => {
    report.console.push({ type: 'exception', text: event.exceptionDetails?.text || 'exception', details: event.exceptionDetails });
  });
  cdp.on('Runtime.consoleAPICalled', (event) => {
    report.console.push({ type: event.type, text: (event.args || []).map((arg) => arg.value ?? arg.description ?? '').join(' ') });
  });
  cdp.on('Log.entryAdded', (event) => {
    report.console.push({ type: `log:${event.entry?.level || 'unknown'}`, text: event.entry?.text || '', source: event.entry?.source || '' });
  });

  const loaded = cdp.waitFor('Page.loadEventFired', () => true, 30_000);
  await cdp.send('Page.navigate', { url: `${TARGET}?smoke=${Date.now()}` });
  await loaded;
  await delay(500);

  const pageTitle = await evaluate(cdp, 'document.title');
  if (!String(pageTitle).includes('Extract Audio')) throw new Error(`Unexpected page title: ${pageTitle}`);
  report.steps.push({ step: 'page_load', ok: true, title: pageTitle });

  await selectFile(cdp, firstVideo);
  const firstReady = await waitForState(cdp, ['ready', 'error'], 45_000);
  if (firstReady.state !== 'ready') throw new Error(`First video did not reach ready state: ${firstReady.status}`);
  report.steps.push({ step: 'first_probe', ok: true, status: firstReady.status });

  const coreRequest = report.requests.find((entry) => entry.url.includes('/tools/extract-audio-from-video/runtime/mediabunny.min.js'));
  if (!coreRequest || coreRequest.status !== 200) throw new Error(`Same-origin Mediabunny runtime did not load with HTTP 200: ${JSON.stringify(coreRequest)}`);
  if (report.failedRequests.length) throw new Error(`Network failures after probe: ${JSON.stringify(report.failedRequests)}`);

  await evaluate(cdp, `document.querySelector('#eav-extract').click()`);
  const firstDone = await waitForState(cdp, ['success', 'error'], 90_000);
  if (firstDone.state !== 'success') throw new Error(`First extraction failed: ${firstDone.status}`);
  await capture(cdp, 'first-success.png');

  const mp3RuntimeRequest = report.requests.find((entry) => entry.url.includes('/tools/extract-audio-from-video/runtime/mediabunny-mp3-encoder.min.js'));
  if (!mp3RuntimeRequest || mp3RuntimeRequest.status !== 200) throw new Error(`Same-origin MP3 encoder did not load with HTTP 200: ${JSON.stringify(mp3RuntimeRequest)}`);

  const playerInfo = await evaluate(cdp, `(async () => {
    const player = document.querySelector('#eav-player');
    if (!player) return null;
    if (!Number.isFinite(player.duration) || player.duration <= 0) {
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 5000);
        player.addEventListener('loadedmetadata', () => { clearTimeout(timeout); resolve(); }, { once: true });
        player.load();
      });
    }
    try { await player.play(); await new Promise((r) => setTimeout(r, 350)); player.pause(); } catch {}
    return { src: player.src, duration: player.duration, currentTime: player.currentTime };
  })()`);
  if (!playerInfo?.src?.startsWith('blob:') || !(playerInfo.duration > 0)) throw new Error(`In-page MP3 is not playable: ${JSON.stringify(playerInfo)}`);
  report.steps.push({ step: 'first_playback', ok: true, playerInfo });

  await evaluate(cdp, `document.querySelector('#eav-download').click()`);
  const downloaded = await waitForDownload();
  const probeJson = JSON.parse(sh(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,codec_type', '-of', 'json', downloaded]));
  const audioStream = (probeJson.streams || []).find((stream) => stream.codec_type === 'audio');
  const duration = Number(probeJson.format?.duration || 0);
  if (audioStream?.codec_name !== 'mp3' || !(duration > 0.5)) throw new Error(`Downloaded file is not a playable MP3: ${JSON.stringify(probeJson)}`);
  report.steps.push({ step: 'first_download_ffprobe', ok: true, file: path.basename(downloaded), codec: audioStream.codec_name, duration });

  await selectFile(cdp, secondVideo);
  const secondReady = await waitForState(cdp, ['ready', 'error'], 45_000);
  if (secondReady.state !== 'ready') throw new Error(`Second video did not reach ready state: ${secondReady.status}`);
  await evaluate(cdp, `document.querySelector('#eav-extract').click()`);
  const secondDone = await waitForState(cdp, ['success', 'error'], 90_000);
  if (secondDone.state !== 'success') throw new Error(`Second extraction failed: ${secondDone.status}`);
  const secondPlayer = await evaluate(cdp, `({ src: document.querySelector('#eav-player')?.src || '', duration: document.querySelector('#eav-player')?.duration || 0 })`);
  if (!secondPlayer.src.startsWith('blob:')) throw new Error(`Second result did not produce a blob URL: ${JSON.stringify(secondPlayer)}`);
  report.steps.push({ step: 'second_file_without_reload', ok: true, status: secondDone.status, player: secondPlayer });
  await capture(cdp, 'second-success.png');

  const externalRuntimeRequests = report.requests.filter((entry) => /cdn\.jsdelivr\.net|unpkg\.com/.test(entry.url));
  if (externalRuntimeRequests.length) throw new Error(`Runtime still depends on external CDN in browser: ${JSON.stringify(externalRuntimeRequests)}`);
  const suspiciousUploads = report.requests.filter((entry) => entry.method !== 'GET' && (entry.postDataLength || 0) > 50_000);
  if (suspiciousUploads.length) throw new Error(`Large request body detected; possible file upload: ${JSON.stringify(suspiciousUploads)}`);
  if (report.failedRequests.length) throw new Error(`Network failures detected: ${JSON.stringify(report.failedRequests)}`);

  report.ok = true;
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(artifactsDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log('Extract Audio production browser smoke: PASS');
  console.log(JSON.stringify({ steps: report.steps, coreRequest, mp3RuntimeRequest }, null, 2));
} catch (error) {
  report.ok = false;
  report.error = String(error?.stack || error);
  report.chromeStderr = chromeStderr.slice(-20_000);
  report.finishedAt = new Date().toISOString();
  try {
    if (cdp) await capture(cdp, 'failure.png');
  } catch {}
  await fs.writeFile(path.join(artifactsDir, 'report.json'), JSON.stringify(report, null, 2));
  console.error(report.error);
  process.exitCode = 1;
} finally {
  try { cdp?.close(); } catch {}
  try { chromeProc.kill('SIGTERM'); } catch {}
  setTimeout(() => { try { chromeProc.kill('SIGKILL'); } catch {} }, 1000).unref();
}
