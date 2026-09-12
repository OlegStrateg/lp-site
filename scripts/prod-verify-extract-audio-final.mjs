import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

const PROD_URL = 'https://layerporter.com/tools/extract-audio-from-video/';
const EVIDENCE = path.resolve('artifacts/extract-audio-production-final');
const WORK = await fs.mkdtemp(path.join(os.tmpdir(), 'lp-eav-prod-final-'));
const DOWNLOADS = path.join(WORK, 'downloads');
await fs.mkdir(EVIDENCE, { recursive: true });
await fs.mkdir(DOWNLOADS, { recursive: true });

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

async function waitFor(check, timeout = 120000, interval = 200, label = 'condition') {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      last = await check();
      if (last) return last;
    } catch (error) {
      last = String(error?.message || error);
    }
    await delay(interval);
  }
  throw new Error(`Timeout waiting for ${label}; last=${JSON.stringify(last)}`);
}

const ffmpeg = findExecutable(['ffmpeg']);
const ffprobe = findExecutable(['ffprobe']);
const chrome = process.env.CHROME_PATH || findExecutable(['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']);
const normalVideo = path.join(WORK, 'normal-primary.mp4');
const fallbackVideo1 = path.join(WORK, 'fallback-first.mp4');
const fallbackVideo2 = path.join(WORK, 'fallback-second.mp4');

sh(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:d=2', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=2', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', normalVideo]);
sh(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:d=1.7', '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=48000:duration=1.7', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', fallbackVideo1]);
sh(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=red:s=320x180:d=1.3', '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=48000:duration=1.3', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', fallbackVideo2]);

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 1;
    this.pending = new Map();
    this.events = [];
    this.handlers = new Map();
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id) {
        const pending = this.pending.get(msg.id);
        if (!pending) return;
        this.pending.delete(msg.id);
        msg.error ? pending.reject(new Error(msg.error.message)) : pending.resolve(msg.result || {});
        return;
      }
      this.events.push(msg);
      const handlers = this.handlers.get(msg.method) || [];
      for (const handler of handlers) Promise.resolve().then(() => handler(msg)).catch(() => {});
    });
  }
  on(method, handler) {
    const list = this.handlers.get(method) || [];
    list.push(handler);
    this.handlers.set(method, list);
  }
  send(method, params = {}, sessionId = undefined) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.ws.send(JSON.stringify(payload));
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

async function waitJson(url, timeout = 20000) {
  return waitFor(async () => {
    try {
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    } catch { return null; }
  }, timeout, 200, `Chrome endpoint ${url}`);
}

const debugPort = await freePort();
const profileDir = path.join(WORK, 'chrome-profile');
const chromeProc = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-allow-origins=*',
  '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDir}`, 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
let chromeStderr = '';
chromeProc.stderr.on('data', (chunk) => { chromeStderr += chunk.toString(); });
await waitJson(`http://127.0.0.1:${debugPort}/json/version`);

const workerSpy = `(() => {
  const NativeWorker = window.Worker;
  let nextWorkerId = 0;
  window.__lpWorkerMessages = [];
  window.__lpWorkersCreated = 0;
  window.Worker = function(...args) {
    const worker = new NativeWorker(...args);
    const workerId = ++nextWorkerId;
    window.__lpWorkersCreated = nextWorkerId;
    worker.addEventListener('message', (event) => {
      const d = event.data || {};
      window.__lpWorkerMessages.push({
        workerId,
        type: String(d.type || ''),
        id: d.id || null,
        engine: d.engine || null,
        error: d.error || null,
        hasAudio: typeof d.hasAudio === 'boolean' ? d.hasAudio : null,
        decodable: typeof d.decodable === 'boolean' ? d.decodable : null,
      });
    });
    return worker;
  };
  window.Worker.prototype = NativeWorker.prototype;
})();`;

async function newTab({ blockMediabunny = false } = {}) {
  const tabResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const tab = await tabResponse.json();
  const cdp = new Cdp(tab.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Log.enable');
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS, eventsEnabled: true });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: workerSpy });

  if (blockMediabunny) {
    await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
    cdp.on('Target.attachedToTarget', async (event) => {
      const sessionId = event.params?.sessionId;
      const type = event.params?.targetInfo?.type;
      if (!sessionId) return;
      if (type === 'worker') {
        await cdp.send('Network.enable', {}, sessionId);
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
        await cdp.send('Network.setBlockedURLs', { urls: ['*mediabunny.min.js*'] }, sessionId);
      }
      await cdp.send('Runtime.runIfWaitingForDebugger', {}, sessionId);
    });
  }

  const url = `${PROD_URL}?prod_verify=${Date.now()}${blockMediabunny ? '&fallback=auto' : ''}`;
  await cdp.send('Page.navigate', { url });
  await waitFor(async () => {
    const result = await cdp.send('Runtime.evaluate', { expression: `document.readyState === 'complete' && !!document.querySelector('#extract-audio-tool')`, returnByValue: true });
    return result.result?.value === true;
  }, 30000, 200, 'production Extract Audio page');
  return { cdp, url };
}

async function evalValue(cdp, expression, awaitPromise = false) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (result.exceptionDetails) throw new Error(`Runtime evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  return result.result?.value;
}

async function uploadFile(cdp, filePath) {
  const doc = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const found = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#eav-file' });
  if (!found.nodeId) throw new Error('Production file input #eav-file not found');
  await cdp.send('DOM.setFileInputFiles', { files: [filePath], nodeId: found.nodeId });
  await evalValue(cdp, `document.querySelector('#eav-file').dispatchEvent(new Event('change', { bubbles: true })); true`);
}

async function waitState(cdp, wanted, timeout = 120000) {
  return waitFor(async () => {
    const value = await evalValue(cdp, `({state: document.querySelector('#extract-audio-tool')?.dataset?.state || '', status: document.querySelector('#eav-status')?.textContent || ''})`);
    if (value?.state === 'error') throw new Error(`UI error: ${value.status}`);
    return value?.state === wanted ? value : null;
  }, timeout, 200, `UI state ${wanted}`);
}

async function extractSelected(cdp) {
  await waitState(cdp, 'ready');
  await evalValue(cdp, `document.querySelector('#eav-extract').click(); true`);
  await waitState(cdp, 'success');
}

async function verifyPlayback(cdp) {
  await waitFor(async () => {
    const value = await evalValue(cdp, `(() => { const a=document.querySelector('#eav-player'); return {duration:Number(a?.duration)||0, ready:Number(a?.readyState)||0}; })()`);
    return value?.duration > 0.5 && value?.ready >= 2 ? value : null;
  }, 30000, 200, 'audio metadata');
  await evalValue(cdp, `document.querySelector('#eav-player').play().then(() => true).catch((e) => { throw e; })`, true);
  const played = await waitFor(async () => {
    const value = await evalValue(cdp, `(() => { const a=document.querySelector('#eav-player'); return {currentTime:Number(a?.currentTime)||0, paused:!!a?.paused, ended:!!a?.ended, duration:Number(a?.duration)||0}; })()`);
    return value?.currentTime > 0.15 || value?.ended ? value : null;
  }, 15000, 100, 'in-page MP3 playback');
  await evalValue(cdp, `document.querySelector('#eav-player').pause(); true`);
  return played;
}

async function downloadAndProbe(cdp, expectedBase) {
  const before = new Set(await fs.readdir(DOWNLOADS));
  await evalValue(cdp, `document.querySelector('#eav-download').click(); true`);
  const downloaded = await waitFor(async () => {
    const names = await fs.readdir(DOWNLOADS);
    const candidates = names.filter((name) => !before.has(name) && name.toLowerCase().endsWith('.mp3') && !name.endsWith('.crdownload'));
    return candidates[0] || null;
  }, 30000, 200, `download ${expectedBase}.mp3`);
  const full = path.join(DOWNLOADS, downloaded);
  const info = JSON.parse(sh(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,codec_type,bit_rate', '-of', 'json', full]));
  const audio = (info.streams || []).find((stream) => stream.codec_type === 'audio');
  const duration = Number(info.format?.duration || 0);
  if (audio?.codec_name !== 'mp3' || duration <= 0.5) throw new Error(`Downloaded result is not a playable MP3: ${JSON.stringify(info)}`);
  return { file: downloaded, codec: audio.codec_name, bitrate: Number(audio.bit_rate || 0), duration, bytes: (await fs.stat(full)).size };
}

async function screenshot(cdp, name) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await fs.writeFile(path.join(EVIDENCE, name), Buffer.from(shot.data, 'base64'));
}

async function workerMessages(cdp) {
  return await evalValue(cdp, `window.__lpWorkerMessages || []`);
}

const report = {
  startedAt: new Date().toISOString(),
  productionUrl: PROD_URL,
  deployedCommit: 'ca543a2c11d3c3ba44d7e282177a258718079d3c',
  chrome,
  ffmpeg,
  ffprobe,
  ordinary: null,
  automaticFallback: null,
  secondFileWithoutReload: null,
  originalErrorProfile: { available: false, reason: 'The original user Chrome profile/device is not exposed to this GitHub Actions runner; this run uses an isolated Chrome for Testing profile.' },
  result: null,
};

let ordinaryCdp;
let fallbackCdp;
try {
  // 1) Ordinary production UI: MP4/AAC -> Mediabunny -> MP3 -> playback -> download.
  ({ cdp: ordinaryCdp } = await newTab({ blockMediabunny: false }));
  await uploadFile(ordinaryCdp, normalVideo);
  await extractSelected(ordinaryCdp);
  const ordinaryPlayback = await verifyPlayback(ordinaryCdp);
  const ordinaryDownload = await downloadAndProbe(ordinaryCdp, 'normal-primary');
  const ordinaryMessages = await workerMessages(ordinaryCdp);
  const ordinaryProbe = ordinaryMessages.find((m) => m.type === 'probe-result');
  const ordinaryResult = ordinaryMessages.find((m) => m.type === 'result');
  if (ordinaryProbe?.engine !== 'mediabunny' || ordinaryResult?.engine !== 'mediabunny') {
    throw new Error(`Ordinary scenario did not use Mediabunny primary engine: ${JSON.stringify(ordinaryMessages)}`);
  }
  await screenshot(ordinaryCdp, '01-production-ordinary-success.png');
  report.ordinary = { status: 'PASS', probeEngine: ordinaryProbe.engine, resultEngine: ordinaryResult.engine, playback: ordinaryPlayback, download: ordinaryDownload, workerMessages: ordinaryMessages };

  // 2) Automatic fallback: do NOT use ?engine=ffmpeg. Block only Mediabunny core inside worker via DevTools.
  ({ cdp: fallbackCdp } = await newTab({ blockMediabunny: true }));
  await uploadFile(fallbackCdp, fallbackVideo1);
  await extractSelected(fallbackCdp);
  const fallbackPlayback1 = await verifyPlayback(fallbackCdp);
  const fallbackDownload1 = await downloadAndProbe(fallbackCdp, 'fallback-first');
  const fallbackMessages1 = await workerMessages(fallbackCdp);
  const fallbackProbe1 = fallbackMessages1.find((m) => m.type === 'probe-result');
  const fallbackResult1 = fallbackMessages1.find((m) => m.type === 'result');
  const blockedEvent = fallbackCdp.events.find((event) => event.method === 'Network.loadingFailed' && /mediabunny/i.test(JSON.stringify(event))) ||
    fallbackCdp.events.find((event) => event.method === 'Network.requestWillBeSent' && /mediabunny\.min\.js/i.test(JSON.stringify(event)));
  if (fallbackProbe1?.engine !== 'ffmpeg' || fallbackResult1?.engine !== 'ffmpeg') {
    throw new Error(`Automatic fallback did not switch to FFmpeg: ${JSON.stringify(fallbackMessages1)}`);
  }
  const workerCountBeforeSecond = await evalValue(fallbackCdp, `window.__lpWorkersCreated || 0`);
  const navigationCountBeforeSecond = await evalValue(fallbackCdp, `performance.getEntriesByType('navigation').length`);
  await screenshot(fallbackCdp, '02-production-auto-fallback-success.png');
  report.automaticFallback = {
    status: 'PASS',
    forcedFfmpegQueryUsed: false,
    inducedPrimaryFailure: 'DevTools blocked only /runtime/mediabunny.min.js inside the dedicated worker; the production worker caught the Mediabunny importScripts failure and continued through its automatic FFmpeg fallback.',
    probeEngine: fallbackProbe1.engine,
    resultEngine: fallbackResult1.engine,
    networkEvidence: blockedEvent ? { method: blockedEvent.method, params: blockedEvent.params, sessionId: blockedEvent.sessionId || null } : null,
    playback: fallbackPlayback1,
    download: fallbackDownload1,
    workerMessages: fallbackMessages1,
  };

  // 3) Second file on the same production page and same worker, without reload.
  await uploadFile(fallbackCdp, fallbackVideo2);
  await extractSelected(fallbackCdp);
  const fallbackPlayback2 = await verifyPlayback(fallbackCdp);
  const fallbackDownload2 = await downloadAndProbe(fallbackCdp, 'fallback-second');
  const allFallbackMessages = await workerMessages(fallbackCdp);
  const resultMessages = allFallbackMessages.filter((m) => m.type === 'result');
  const secondResult = resultMessages[resultMessages.length - 1];
  const workerCountAfterSecond = await evalValue(fallbackCdp, `window.__lpWorkersCreated || 0`);
  const navigationCountAfterSecond = await evalValue(fallbackCdp, `performance.getEntriesByType('navigation').length`);
  const currentUrl = await evalValue(fallbackCdp, `location.href`);
  if (secondResult?.engine !== 'ffmpeg') throw new Error(`Second file did not complete through FFmpeg fallback: ${JSON.stringify(allFallbackMessages)}`);
  if (workerCountAfterSecond !== workerCountBeforeSecond) throw new Error(`Worker was recreated between files: ${workerCountBeforeSecond} -> ${workerCountAfterSecond}`);
  if (navigationCountAfterSecond !== navigationCountBeforeSecond) throw new Error(`Page navigation count changed between files: ${navigationCountBeforeSecond} -> ${navigationCountAfterSecond}`);
  await screenshot(fallbackCdp, '03-production-second-file-same-page.png');
  report.secondFileWithoutReload = {
    status: 'PASS',
    samePage: true,
    sameWorker: true,
    workerCountBeforeSecond,
    workerCountAfterSecond,
    navigationCountBeforeSecond,
    navigationCountAfterSecond,
    currentUrl,
    resultEngine: secondResult.engine,
    playback: fallbackPlayback2,
    download: fallbackDownload2,
  };

  report.result = 'PASS';
  report.finishedAt = new Date().toISOString();
  console.log(`PRODUCTION EXTRACT AUDIO FINAL PASS — ordinary=${ordinaryResult.engine}/${ordinaryDownload.duration}s; auto-fallback=${fallbackResult1.engine}/${fallbackDownload1.duration}s; second=${secondResult.engine}/${fallbackDownload2.duration}s`);
} catch (error) {
  report.result = 'FAIL';
  report.error = String(error?.stack || error);
  report.chromeStderr = chromeStderr.slice(-12000);
  report.finishedAt = new Date().toISOString();
  throw error;
} finally {
  try { await fs.writeFile(path.join(EVIDENCE, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8'); } catch {}
  ordinaryCdp?.close();
  fallbackCdp?.close();
  chromeProc.kill('SIGTERM');
}
