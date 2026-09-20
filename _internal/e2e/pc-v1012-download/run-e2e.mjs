import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

const repo = process.cwd();
const fixture = path.join(repo, '_internal/e2e/pc-v1012-download');
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'pc-v1012-download-'));
const profile = path.join(work, 'profile');
const downloads = path.join(work, 'downloads');
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(downloads, { recursive: true });

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function waitFor(fn, timeout = 30000, label = 'condition') {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      last = String(error?.message || error);
    }
    await delay(120);
  }
  throw new Error(`Timeout waiting for ${label}${last ? `: ${last}` : ''}`);
}
async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function installChromeForTesting() {
  const metadata = await (await fetch('https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json')).json();
  const stable = metadata.channels.Stable;
  const download = stable.downloads.chrome.find((item) => item.platform === 'linux64');
  const archive = path.join(work, 'chrome.zip');
  let run = spawnSync('curl', ['-L', '--fail', '--retry', '3', '--silent', '--show-error', '-o', archive, download.url], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr);
  run = spawnSync('unzip', ['-q', archive, '-d', work], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr);
  return { binary: path.join(work, 'chrome-linux64', 'chrome'), version: stable.version };
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 1;
    this.pending = new Map();
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (!msg.id) return;
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      this.pending.delete(msg.id);
      msg.error ? pending.reject(new Error(msg.error.message)) : pending.resolve(msg.result || {});
    });
  }
  send(method, params = {}, sessionId) {
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

async function endpointJson(url) {
  return waitFor(async () => {
    try {
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    } catch {
      return null;
    }
  }, 30000, url);
}
async function evaluate(cdp, sessionId, expression, awaitPromise = false) {
  const out = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise }, sessionId);
  if (out.exceptionDetails) throw new Error(JSON.stringify(out.exceptionDetails));
  return out.result?.value;
}
async function completeDownloads() {
  return (await fs.readdir(downloads)).filter((name) => !name.endsWith('.crdownload')).sort();
}
async function waitFile(match, expectedSize = null, timeout = 30000) {
  return waitFor(async () => {
    const names = await completeDownloads();
    const name = typeof match === 'function' ? names.find(match) : (names.includes(match) ? match : null);
    if (!name) return null;
    const stat = await fs.stat(path.join(downloads, name));
    if (expectedSize != null && stat.size !== expectedSize) return null;
    return { name, size: stat.size };
  }, timeout, typeof match === 'string' ? match : 'matching download');
}

const chromeInfo = await installChromeForTesting();
const debugPort = await freePort();
const chrome = spawn(chromeInfo.binary, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  `--disable-extensions-except=${fixture}`,
  `--load-extension=${fixture}`,
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

let stderr = '';
chrome.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
let cdp;

try {
  const version = await endpointJson(`http://127.0.0.1:${debugPort}/json/version`);
  cdp = new Cdp(version.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloads,
    eventsEnabled: true,
  });

  const workerMatch = await waitFor(async () => {
    const targets = await cdp.send('Target.getTargets');
    const candidates = (targets.targetInfos || []).filter((target) =>
      target.type === 'service_worker'
      && String(target.url).startsWith('chrome-extension://')
    );
    for (const candidate of candidates) {
      try {
        const attached = await cdp.send('Target.attachToTarget', { targetId: candidate.targetId, flatten: true });
        await cdp.send('Runtime.enable', {}, attached.sessionId);
        const candidateManifest = await evaluate(cdp, attached.sessionId, 'chrome.runtime.getManifest()');
        if (candidateManifest?.name === 'PC v1.0.12 download E2E') {
          return { worker: candidate, workerSession: attached.sessionId, manifest: candidateManifest };
        }
        await cdp.send('Target.detachFromTarget', { sessionId: attached.sessionId }).catch(() => {});
      } catch {}
    }
    return null;
  }, 30000, 'PC v1.0.12 service worker');

  const worker = workerMatch.worker;
  const workerSession = workerMatch.workerSession;
  const manifest = workerMatch.manifest;
  const extensionId = new URL(worker.url).host;
  console.log('PC_V1012_MANIFEST', JSON.stringify(manifest));

  if (manifest.permissions.includes('downloads')) throw new Error('downloads permission still present');
  if (!manifest.permissions.includes('offscreen')) throw new Error('offscreen permission missing');

  await evaluate(
    cdp,
    workerSession,
    `chrome.tabs.create({url:chrome.runtime.getURL('test.html'),active:true}).then(tab=>tab.id)`,
    true
  );

  const page = await waitFor(async () => {
    const targets = await cdp.send('Target.getTargets');
    return targets.targetInfos?.find((target) =>
      target.type === 'page'
      && target.url === `chrome-extension://${extensionId}/test.html`
    ) || null;
  }, 30000, 'test page');

  const pageAttach = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  const pageSession = pageAttach.sessionId;
  await cdp.send('Runtime.enable', {}, pageSession);
  await waitFor(() => evaluate(cdp, pageSession, 'typeof globalThis.testSend === "function"'), 10000, 'testSend');

  const warnings = await evaluate(cdp, pageSession, 'testSend({cmd:"test-warnings"})', true);
  if (!warnings?.ok) throw new Error(`permission warning probe failed: ${JSON.stringify(warnings)}`);
  if (warnings.warnings.some((warning) => /Manage your downloads/i.test(warning))) {
    throw new Error(`downloads warning remains: ${JSON.stringify(warnings.warnings)}`);
  }

  const actualWarnings = await evaluate(
    cdp,
    pageSession,
    `chrome.management.getPermissionWarningsByManifest(${JSON.stringify(JSON.stringify({"update_url":"https://clients2.google.com/service/update2/crx","manifest_version":3,"name":"__MSG_extName__","version":"1.0.12","description":"__MSG_extDesc__","default_locale":"en","message_serialization":"structured_clone","externally_connectable":{"matches":["https://layerporter.com/*"]},"permissions":["activeTab","scripting","contextMenus","offscreen","storage","sidePanel"],"host_permissions":["<all_urls>"],"side_panel":{"default_path":"src/editor.html"},"content_scripts":[{"matches":["https://layerporter.com/picture-converter/welcome/*"],"js":["src/welcome-bridge.js"],"run_at":"document_idle"},{"matches":["http://*/*","https://*/*"],"exclude_matches":["https://layerporter.com/picture-converter/welcome/*"],"js":["src/panel.js"],"run_at":"document_end"}],"web_accessible_resources":[{"resources":["icons/icon48.png","icons/icon128.png"],"matches":["<all_urls>"]}],"content_security_policy":{"extension_pages":"script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"},"background":{"service_worker":"src/background.js","type":"module"},"commands":{"launch-picker":{"suggested_key":{"default":"Alt+Shift+C"},"description":"__MSG_cmdPicker__"}},"action":{"default_title":"Picture Converter","default_icon":{"16":"icons/icon16.png","48":"icons/icon48.png","128":"icons/icon128.png"}},"icons":{"16":"icons/icon16.png","48":"icons/icon48.png","128":"icons/icon128.png"},"version_name":"1.0.12"}))})`,
    true
  );
  if (actualWarnings.some((warning) => /Manage your downloads/i.test(warning))) {
    throw new Error(`actual candidate still warns about downloads: ${JSON.stringify(actualWarnings)}`);
  }

  const formats = [
    ['png', 'image/png'],
    ['jpg', 'image/jpeg'],
    ['webp', 'image/webp'],
    ['pdf', 'application/pdf'],
    ['ico', 'image/x-icon'],
  ];
  const formatResults = [];
  for (let i = 0; i < formats.length; i++) {
    const [ext, mime] = formats[i];
    const size = 4096 + i * 257;
    const response = await evaluate(
      cdp,
      pageSession,
      `testSend(${JSON.stringify({ cmd: 'test-save', filename: `image.${ext}`, mime, size, seed: 20 + i })})`,
      true
    );
    if (!response?.ok) throw new Error(`${ext} save failed: ${JSON.stringify(response)}`);
    const file = await waitFile(`image.${ext}`, size);
    formatResults.push({ ext, mode: response.mode, ...file });
  }

  // Legacy/data-URL fallback path.
  const legacyResponse = await evaluate(cdp, pageSession, 'testSend({cmd:"test-data-url",filename:"legacy.bin"})', true);
  if (!legacyResponse?.ok) throw new Error(`data-url fallback failed: ${JSON.stringify(legacyResponse)}`);
  const legacy = await waitFile('legacy.bin', 8);

  // Rapid repeated downloads. Use unique names to test concurrency without
  // depending on Chrome's duplicate-name suffix policy.
  const repeatExpressions = [];
  for (let i = 0; i < 6; i++) {
    repeatExpressions.push(`testSend(${JSON.stringify({
      cmd: 'test-save',
      filename: `repeat-${i}.png`,
      mime: 'image/png',
      size: 8192 + i,
      seed: 40 + i,
    })})`);
  }
  const repeated = await evaluate(cdp, pageSession, `Promise.all([${repeatExpressions.join(',')}])`, true);
  if (!Array.isArray(repeated) || repeated.some((item) => !item?.ok)) {
    throw new Error(`repeated saves failed: ${JSON.stringify(repeated)}`);
  }
  for (let i = 0; i < 6; i++) await waitFile(`repeat-${i}.png`, 8192 + i);

  // 20 MiB catches Blob/message/revoke/memory regressions.
  const largeSize = 20 * 1024 * 1024;
  const largeResponse = await evaluate(
    cdp,
    pageSession,
    `testSend({cmd:"test-save",filename:"large.bin",mime:"application/octet-stream",size:${largeSize},seed:91})`,
    true
  );
  if (!largeResponse?.ok) throw new Error(`large save failed: ${JSON.stringify(largeResponse)}`);
  const large = await waitFile('large.bin', largeSize, 60000);

  console.log('PC_V1012_DOWNLOAD_E2E_PASS', JSON.stringify({
    chrome: version.Browser,
    chromeForTesting: chromeInfo.version,
    permissions: manifest.permissions,
    warnings: warnings.warnings,
    actualCandidateWarnings: actualWarnings,
    formats: formatResults,
    legacy: { mode: legacyResponse.mode, ...legacy },
    repeated: repeated.map((item) => item.mode),
    large: { mode: largeResponse.mode, ...large },
  }));
} catch (error) {
  console.error('PC_V1012_DOWNLOAD_E2E_FAIL', error?.stack || error);
  console.error(stderr.slice(-12000));
  process.exitCode = 1;
} finally {
  cdp?.close();
  chrome.kill('SIGTERM');
}
