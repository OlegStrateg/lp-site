import fs from 'node:fs/promises';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const testLang = (process.env.LP_TEST_LANG || 'en').toLowerCase();
if (!['en', 'ru'].includes(testLang)) throw new Error(`Unsupported LP_TEST_LANG: ${testLang}`);

const repo = process.cwd();
const fixturePath = path.join(repo, '_internal/e2e/picture-converter/layerporter-edit-bridge.js');
const bridge = await fs.readFile(fixturePath, 'utf8');
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'lp-picture-converter-e2e-'));

async function installChromeForTesting() {
  const metadataUrl = 'https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json';
  const metadataResponse = await fetch(metadataUrl);
  if (!metadataResponse.ok) throw new Error(`Chrome for Testing metadata failed: ${metadataResponse.status}`);
  const metadata = await metadataResponse.json();
  const stable = metadata?.channels?.Stable;
  const download = stable?.downloads?.chrome?.find((item) => item.platform === 'linux64');
  if (!stable?.version || !download?.url) throw new Error('Chrome for Testing stable linux64 download missing');

  const archive = path.join(work, 'chrome-for-testing.zip');
  const curl = spawnSync('curl', ['-L', '--fail', '--retry', '3', '--silent', '--show-error', '-o', archive, download.url], { encoding: 'utf8' });
  if (curl.status !== 0) throw new Error(`Chrome for Testing download failed: ${curl.stderr}`);

  const unzip = spawnSync('unzip', ['-q', archive, '-d', work], { encoding: 'utf8' });
  if (unzip.status !== 0) throw new Error(`Chrome for Testing unzip failed: ${unzip.stderr}`);

  const binary = path.join(work, 'chrome-linux64', 'chrome');
  await fs.access(binary);
  return { binary, version: stable.version };
}

const chromeForTesting = await installChromeForTesting();
const chromePath = chromeForTesting.binary;
const extensionDir = path.join(work, 'extension');
const profile = path.join(work, 'profile');
await fs.mkdir(extensionDir, { recursive: true });
await fs.mkdir(profile, { recursive: true });

const manifest = {
  manifest_version: 3,
  name: 'LayerPorter Picture Converter bridge E2E',
  version: '0.0.0',
  default_locale: testLang,
  message_serialization: 'structured_clone',
  externally_connectable: { matches: ['https://layerporter.com/*'] },
  permissions: ['storage'],
  background: { service_worker: 'background.js', type: 'module' },
  action: { default_title: 'Picture Converter' }
};

await fs.writeFile(path.join(extensionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
await fs.mkdir(path.join(extensionDir, '_locales', testLang), { recursive: true });
await fs.writeFile(
  path.join(extensionDir, '_locales', testLang, 'messages.json'),
  JSON.stringify({
    layerPorterWebLocale: { message: testLang },
    editImageOnLayerPorter: { message: testLang === 'ru' ? 'Редактировать в LayerPorter' : 'Edit in LayerPorter' }
  }, null, 2)
);
await fs.writeFile(path.join(extensionDir, 'layerporter-edit-bridge.js'), bridge);
await fs.writeFile(path.join(extensionDir, 'background.js'), "import './layerporter-edit-bridge.js';\n");
await fs.writeFile(path.join(extensionDir, 'editor.html'), `<!doctype html><html><head><style>
body{margin:0}.stage{position:relative;width:330px;height:220px;margin:20px;border:1px solid #ddd}
#replaceBtn{position:absolute;top:16px;right:16px;width:112px;height:34px}
#canvas{width:120px;height:90px}.download-wrap{width:330px;margin:20px}
#downloadBtn{width:100%;height:44px}
</style></head><body>
<div id="stage" class="stage">
  <canvas id="canvas"></canvas>
  <button id="replaceBtn" type="button">Replace image</button>
</div>
<div class="download-wrap"><button id="downloadBtn" type="button">Download</button></div>
<script type="module" src="layerporter-edit-bridge.js"></script>
</body></html>`);

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
    await delay(150);
  }
  throw new Error(`Timeout waiting for ${label}${last ? `: ${last}` : ''}`);
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

const chromeVersionProbe = spawnSync(chromePath, ['--version'], { encoding: 'utf8' });
const chromeVersion = chromeVersionProbe.stdout.trim();
console.log('CHROME FOR TESTING PATH:', chromePath);
console.log('CHROME FOR TESTING METADATA VERSION:', chromeForTesting.version);
console.log('CHROME VERSION:', chromeVersion);
if (chromeVersionProbe.stderr) console.log('CHROME VERSION STDERR:', chromeVersionProbe.stderr.trim());
const major = Number(chromeVersion.match(/(\d+)/)?.[1] || 0);
if (major < 148) throw new Error(`Chrome >=148 required, got ${chromeVersion}`);

const expectedPath = testLang === 'ru' ? '/ru/tools/crop-image/' : '/tools/crop-image/';
const requests = [];

const debugPort = await freePort();
const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  `--lang=${testLang === 'ru' ? 'ru-RU' : 'en-US'}`,
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  `--disable-extensions-except=${extensionDir}`,
  `--load-extension=${extensionDir}`,
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

let chromeStderr = '';
chrome.stderr.on('data', (chunk) => { chromeStderr += chunk.toString(); });

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
  }, 30000, `endpoint ${url}`);
}

async function evaluate(cdp, sessionId, expression, awaitPromise = false) {
  const out = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise }, sessionId);
  if (out.exceptionDetails) throw new Error(`Runtime exception: ${JSON.stringify(out.exceptionDetails)}`);
  return out.result?.value;
}

let cdp;
const report = { chromeVersion, testLang, expectedPath, result: 'FAIL', requests: [] };
try {
  let version;
  try {
    version = await endpointJson(`http://127.0.0.1:${debugPort}/json/version`);
  } catch (error) {
    console.error('CHROME STARTUP STDERR:', chromeStderr);
    console.error('CHROME EXIT CODE:', chrome.exitCode, 'SIGNAL:', chrome.signalCode);
    throw error;
  }
  cdp = new Cdp(version.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Target.setDiscoverTargets', { discover: true });

  const extensionMatch = await waitFor(async () => {
    const targets = await cdp.send('Target.getTargets');
    const candidates = (targets.targetInfos || []).filter((t) =>
      String(t.url || '').startsWith('chrome-extension://') &&
      (t.type === 'service_worker' || t.type === 'background_page')
    );
    report.initialTargets = targets.targetInfos?.map((t) => ({ targetId: t.targetId, type: t.type, url: t.url })) || [];

    for (const candidate of candidates) {
      try {
        const attached = await cdp.send('Target.attachToTarget', { targetId: candidate.targetId, flatten: true });
        const sessionId = attached.sessionId;
        await cdp.send('Runtime.enable', {}, sessionId);
        const manifest = await evaluate(cdp, sessionId, 'chrome.runtime.getManifest()');
        if (manifest?.name === 'LayerPorter Picture Converter bridge E2E') {
          return { target: candidate, sessionId, manifest };
        }
        await cdp.send('Target.detachFromTarget', { sessionId }).catch(() => {});
      } catch {}
    }
    return null;
  }, 30000, 'Picture Converter service worker target by manifest name');

  const extensionTarget = extensionMatch.target;
  const workerSession = extensionMatch.sessionId;
  const extensionId = new URL(extensionTarget.url).host;
  report.extensionId = extensionId;
  report.loadedManifest = extensionMatch.manifest;
  console.log('E2E extension:', extensionId, extensionMatch.manifest?.name);

  await cdp.send('Runtime.enable', {}, workerSession);
  const workerDiagnostics = await evaluate(
    cdp,
    workerSession,
    `(async () => {
      const url = chrome.runtime.getURL('editor.html');
      let fetchResult = null;
      try {
        const response = await fetch(url);
        fetchResult = { ok: response.ok, status: response.status, url: response.url, text: (await response.text()).slice(0, 500) };
      } catch (error) {
        fetchResult = { error: String(error?.stack || error) };
      }
      return { manifest: chrome.runtime.getManifest(), runtimeId: chrome.runtime.id, editorUrl: url, fetchResult };
    })()`,
    true
  );
  report.workerDiagnostics = workerDiagnostics;
  console.log('WORKER DIAGNOSTICS', JSON.stringify(workerDiagnostics));

  const openedTabId = await evaluate(
    cdp,
    workerSession,
    `new Promise((resolve, reject) => { chrome.tabs.create({ url: chrome.runtime.getURL('editor.html'), active: true }, (tab) => { const e = chrome.runtime.lastError; if (e) reject(new Error(e.message)); else resolve(tab?.id || 0); }); })`,
    true
  );
  report.openedTabId = openedTabId;

  const editorTarget = await waitFor(async () => {
    const targets = await cdp.send('Target.getTargets');
    return targets.targetInfos?.find((t) => t.type === 'page' && t.url === `chrome-extension://${extensionId}/editor.html`) || null;
  }, 30000, 'extension editor target');

  const editorAttach = await cdp.send('Target.attachToTarget', { targetId: editorTarget.targetId, flatten: true });
  const editorSession = editorAttach.sessionId;
  await cdp.send('Runtime.enable', {}, editorSession);
  await cdp.send('Page.enable', {}, editorSession);

  try {
    await waitFor(
      async () => evaluate(cdp, editorSession, `document.readyState === 'complete' && location.protocol === 'chrome-extension:' && !!document.getElementById('canvas') && !!document.getElementById('downloadBtn')`),
      30000,
      'extension editor DOM'
    );
  } catch (error) {
    report.editorDiagnostics = {
      href: await evaluate(cdp, editorSession, `location.href`).catch(() => ''),
      readyState: await evaluate(cdp, editorSession, `document.readyState`).catch(() => ''),
      html: await evaluate(cdp, editorSession, `document.documentElement?.outerHTML?.slice(0,4000) || ''`).catch(() => ''),
    };
    console.error('EDITOR DIAGNOSTICS', JSON.stringify(report.editorDiagnostics));
    throw error;
  }

  await evaluate(cdp, editorSession, `(()=>{const c=document.getElementById('canvas');c.width=4;c.height=3;const x=c.getContext('2d');x.fillStyle='#ff0000';x.fillRect(0,0,4,3);document.body.classList.add('has-img');document.body.classList.remove('batch-mode');return true})()`);
  await waitFor(async () => evaluate(cdp, editorSession, `!!document.getElementById('lpWebEditBtn')`), 15000, 'Edit in LayerPorter button');

  const normalDisplay = await evaluate(cdp, editorSession, `getComputedStyle(document.getElementById('lpWebEditBtn')).display`);
  const placement = await waitFor(async () => {
    const value = await evaluate(cdp, editorSession, `(()=>{const e=document.getElementById('lpWebEditBtn');const r=document.getElementById('replaceBtn');const s=document.getElementById('stage');const er=e.getBoundingClientRect();const rr=r.getBoundingClientRect();const sr=s.getBoundingClientRect();return {floating:e.classList.contains('lp-edit-floating'),compact:e.classList.contains('lp-edit-compact'),edit:{left:er.left,right:er.right,top:er.top,width:er.width},replace:{left:rr.left,right:rr.right,top:rr.top,width:rr.width},stage:{left:sr.left,right:sr.right,width:sr.width},gap:rr.left-er.right,overlap:!(er.right<=rr.left||er.left>=rr.right)};})()`);
    return value?.floating && !value?.overlap && value?.gap >= 6 ? value : null;
  }, 10000, 'Edit button next to Replace without overlap');

  const batchDisplay = await evaluate(cdp, editorSession, `(()=>{document.body.classList.add('batch-mode');const d=getComputedStyle(document.getElementById('lpWebEditBtn')).display;document.body.classList.remove('batch-mode');return d})()`);
  if (normalDisplay !== 'flex' || batchDisplay !== 'none') throw new Error(`button visibility gate failed normal=${normalDisplay} batch=${batchDisplay}`);

  const narrowPlacement = await waitFor(async () => {
    await evaluate(cdp, editorSession, `document.getElementById('stage').style.width='190px'; true`);
    const value = await evaluate(cdp, editorSession, `(()=>{const e=document.getElementById('lpWebEditBtn');const r=document.getElementById('replaceBtn');const er=e.getBoundingClientRect();const rr=r.getBoundingClientRect();return {compact:e.classList.contains('lp-edit-compact'),editWidth:er.width,gap:rr.left-er.right,overlap:!(er.right<=rr.left||er.left>=rr.right)};})()`);
    return value?.compact && !value?.overlap && value?.gap >= 6 ? value : null;
  }, 10000, 'compact Edit button on narrow panel');
  await evaluate(cdp, editorSession, `document.getElementById('stage').style.width='330px'; true`);

  const handoffStartedAt = Date.now();
  await evaluate(cdp, editorSession, `document.getElementById('lpWebEditBtn').click(); true`);

  const siteTarget = await waitFor(async () => {
    const targets = await cdp.send('Target.getTargets');
    return targets.targetInfos?.find((t) => {
      try {
        const url = new URL(String(t.url || ''));
        return url.origin === 'https://layerporter.com' && url.pathname === expectedPath;
      } catch {
        return false;
      }
    }) || null;
  }, 30000, 'production LayerPorter handoff tab');

  const siteAttach = await cdp.send('Target.attachToTarget', { targetId: siteTarget.targetId, flatten: true });
  const siteSession = siteAttach.sessionId;
  await cdp.send('Runtime.enable', {}, siteSession);
  await cdp.send('Page.enable', {}, siteSession);

  let evidence;
  try {
    evidence = await waitFor(async () => {
      const value = await evaluate(cdp, siteSession, `(()=> {
        const workspace = document.querySelector('#crop-workspace');
        const drop = document.querySelector('#crop-drop');
        const fileMeta = document.querySelector('#crop-file-meta');
        const status = document.querySelector('#crop-status');
        const root = document.documentElement;
        return {
          href: location.href,
          path: location.pathname,
          search: location.search,
          state: root.dataset.lpWorkspaceState || '',
          importState: root.dataset.lpExtensionImport || '',
          workspaceHidden: workspace ? workspace.hidden : null,
          dropHidden: drop ? drop.hidden : null,
          fileMeta: fileMeta?.textContent || '',
          status: status?.textContent || '',
          chromeRuntime: !!globalThis.chrome?.runtime?.sendMessage,
          readyState: document.readyState
        };
      })()`);
      return value?.state === 'active' && value?.workspaceHidden === false && value?.dropHidden === true && value?.fileMeta ? value : null;
    }, 30000, 'production workspace active');
  } catch (error) {
    const diagnostics = await evaluate(cdp, siteSession, `(()=> {
      const workspace = document.querySelector('#crop-workspace');
      const drop = document.querySelector('#crop-drop');
      const fileMeta = document.querySelector('#crop-file-meta');
      const status = document.querySelector('#crop-status');
      const root = document.documentElement;
      return {
        href: location.href,
        path: location.pathname,
        search: location.search,
        state: root.dataset.lpWorkspaceState || '',
        importState: root.dataset.lpExtensionImport || '',
        workspaceHidden: workspace ? workspace.hidden : null,
        dropHidden: drop ? drop.hidden : null,
        fileMeta: fileMeta?.textContent || '',
        status: status?.textContent || '',
        chromeRuntime: !!globalThis.chrome?.runtime?.sendMessage,
        readyState: document.readyState,
        bodyClass: document.body?.className || ''
      };
    })()`).catch(() => null);
    report.productionDiagnostics = diagnostics;
    console.error('PRODUCTION DIAGNOSTICS', JSON.stringify(diagnostics));
    throw error;
  }

  evidence.elapsedMs = Date.now() - handoffStartedAt;

  if (evidence.path !== expectedPath) throw new Error(`wrong route: ${evidence.path}`);
  if (evidence.search.includes('lp_edit_token') || evidence.search.includes('lp_extension_id')) throw new Error('handoff parameters were not cleaned');
  if (evidence.importState !== 'success') throw new Error(`unexpected import state: ${evidence.importState}`);

  report.button = { normalDisplay, batchDisplay, placement, narrowPlacement };
  report.productionHandoff = evidence;
  report.requests = requests;
  report.result = 'PASS';

  console.log(`PICTURE CONVERTER → PRODUCTION LAYERPORTER PASS — ${chromeVersion} — lang=${testLang} — path=${evidence.path} — ready=${evidence.elapsedMs}ms — meta=${evidence.fileMeta}`);
} catch (error) {
  report.error = String(error?.stack || error);
  report.chromeStderr = chromeStderr.slice(-12000);
  console.error('E2E FAILURE STDERR:', report.chromeStderr);
  throw error;
} finally {
  report.requests = requests;
  await fs.writeFile(path.join(repo, `picture-converter-handoff-e2e-${testLang}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8').catch(() => {});
  cdp?.close();
  chrome.kill('SIGTERM');
}
