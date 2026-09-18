const EDIT_ORIGIN = 'https://layerporter.com';

function editBaseUrl() {
  try {
    const webLocale = String(chrome.i18n?.getMessage?.('layerPorterWebLocale') || 'en').toLowerCase();
    return webLocale === 'ru'
      ? 'https://layerporter.com/ru/tools/crop-image/'
      : 'https://layerporter.com/tools/crop-image/';
  } catch {
    return 'https://layerporter.com/tools/crop-image/';
  }
}
const DB_NAME = 'lp-layerporter-edit-v1';
const STORE_NAME = 'assets';
const TTL_MS = 5 * 60 * 1000;

function productSource() {
  try {
    const title = String(chrome.runtime.getManifest()?.action?.default_title || '');
    return /picture converter/i.test(title) ? 'picture_converter' : 'pinterest_downloader';
  } catch {
    return 'extension';
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'token' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
  });
}

async function runStoreTransaction(mode, schedule) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      try { tx.abort(); } catch {}
      try { db.close(); } catch {}
      reject(error instanceof Error ? error : new Error(String(error || 'IndexedDB transaction failed')));
    };

    tx.oncomplete = () => {
      if (settled) return;
      settled = true;
      try { db.close(); } catch {}
      resolve(result);
    };
    tx.onerror = () => fail(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort = () => fail(tx.error || new Error('IndexedDB transaction aborted'));

    try {
      schedule(store, (value) => { result = value; }, fail);
    } catch (error) {
      fail(error);
    }
  });
}

async function cleanupExpiredAssets() {
  const cutoff = Date.now() - TTL_MS;
  try {
    await runStoreTransaction('readwrite', (store, setResult, fail) => {
      const request = store.openCursor();
      request.onerror = () => fail(request.error || new Error('IndexedDB cursor failed'));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          setResult(true);
          return;
        }
        if (Number(cursor.value?.createdAt || 0) < cutoff) cursor.delete();
        cursor.continue();
      };
    });
  } catch {
    // Cleanup is best-effort. A stale token never bypasses TTL validation in takeAsset().
  }
}

async function putAsset(blob, name) {
  const token = crypto.randomUUID().replace(/-/g, '');
  const entry = {
    token,
    blob,
    name: String(name || 'image.png').slice(0, 160),
    type: blob.type || 'image/png',
    createdAt: Date.now(),
  };

  await runStoreTransaction('readwrite', (store, setResult, fail) => {
    const request = store.put(entry);
    request.onerror = () => fail(request.error || new Error('Asset store failed'));
    request.onsuccess = () => setResult(token);
  });

  cleanupExpiredAssets();
  return token;
}

async function takeAsset(token) {
  if (!/^[A-Za-z0-9_-]{20,160}$/.test(String(token || ''))) return null;

  return runStoreTransaction('readwrite', (store, setResult, fail) => {
    const request = store.get(token);
    request.onerror = () => fail(request.error || new Error('Asset lookup failed'));
    request.onsuccess = () => {
      const entry = request.result || null;
      if (entry) store.delete(token);
      const fresh = entry && Date.now() - Number(entry.createdAt || 0) <= TTL_MS;
      setResult(fresh ? entry : null);
    };
  });
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function fallbackOpen() {
  const url = new URL(editBaseUrl());
  url.searchParams.set('lp_source', productSource());
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas export failed')), 'image/png');
  });
}

function installEditorButton() {
  const install = () => {
    const canvas = document.getElementById('canvas');
    const download = document.getElementById('downloadBtn');
    const replace = document.getElementById('replaceBtn');
    const stage = document.getElementById('stage');
    if (
      !(canvas instanceof HTMLCanvasElement)
      || !(download instanceof HTMLElement)
      || !(replace instanceof HTMLElement)
      || !(stage instanceof HTMLElement)
      || document.getElementById('lpWebEditBtn')
    ) return;

    const style = document.createElement('style');
    style.textContent = `
      #lpWebEditBtn{
        display:none;width:100%;min-height:44px;margin-top:8px;
        border:1px solid rgba(74,50,203,.26);border-radius:12px;
        background:#fff;color:#4a32cb;
        font:700 13px/1.2 Inter,Geist,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        cursor:pointer;align-items:center;justify-content:center;gap:7px;
        transition:background .15s,border-color .15s,transform .15s,box-shadow .15s
      }
      body.has-img:not(.batch-mode) #lpWebEditBtn{display:flex}
      #lpWebEditBtn:hover{background:#f6f3ff;border-color:#4a32cb;transform:translateY(-1px)}
      #lpWebEditBtn:focus-visible{outline:2px solid #4a32cb;outline-offset:2px}
      #lpWebEditBtn:disabled{opacity:.55;cursor:wait;transform:none}
      #lpWebEditBtn .lp-edit-icon{width:16px;height:16px;flex:0 0 16px}
      #lpWebEditBtn.lp-edit-floating{
        position:absolute;z-index:3;width:auto;min-width:96px;height:34px;min-height:34px;
        margin:0;padding:0 10px;border-radius:10px;
        background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,247,253,.95));
        box-shadow:0 4px 12px rgba(32,22,75,.12),inset 0 1px 0 rgba(255,255,255,.9);
        white-space:nowrap
      }
      #lpWebEditBtn.lp-edit-floating:hover{
        box-shadow:0 7px 16px rgba(58,39,145,.16),inset 0 1px 0 #fff
      }
      #lpWebEditBtn.lp-edit-floating.lp-edit-compact{
        width:34px;min-width:34px;padding:0;gap:0
      }
      #lpWebEditBtn.lp-edit-floating.lp-edit-compact .lp-edit-label{display:none}
    `;
    document.head.appendChild(style);

    const button = document.createElement('button');
    button.id = 'lpWebEditBtn';
    button.type = 'button';
    const label = chrome.i18n?.getMessage?.('editImageOnLayerPorter') || 'Edit image';
    button.title = label;
    button.setAttribute('aria-label', label);

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'lp-edit-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '2');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('stroke-linejoin', 'round');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>';

    const labelNode = document.createElement('span');
    labelNode.className = 'lp-edit-label';
    labelNode.textContent = label;
    button.append(icon, labelNode);

    // Full editor keeps the previous non-invasive placement below Download.
    download.insertAdjacentElement('afterend', button);

    let placementFrame = 0;
    const placeButton = () => {
      cancelAnimationFrame(placementFrame);
      placementFrame = requestAnimationFrame(() => {
        const sidePanelPlacement = replace.parentElement === stage;

        if (!sidePanelPlacement) {
          if (button.previousElementSibling !== download) download.insertAdjacentElement('afterend', button);
          button.classList.remove('lp-edit-floating', 'lp-edit-compact');
          button.style.top = '';
          button.style.right = '';
          button.style.left = '';
          return;
        }

        if (button.parentElement !== stage) stage.appendChild(button);
        button.classList.add('lp-edit-floating');
        button.classList.remove('lp-edit-compact');

        const stageRect = stage.getBoundingClientRect();
        const replaceRect = replace.getBoundingClientRect();
        const gap = 8;
        const edgeGap = Math.max(0, stageRect.right - replaceRect.right);
        const right = Math.max(0, edgeGap + replaceRect.width + gap);
        const top = Math.max(0, replaceRect.top - stageRect.top);

        button.style.top = `${Math.round(top)}px`;
        button.style.right = `${Math.round(right)}px`;
        button.style.left = 'auto';

        // Narrow side panels must never wrap or push the existing Replace button.
        const requiredWidth = right + button.getBoundingClientRect().width + 8;
        if (requiredWidth > stageRect.width) button.classList.add('lp-edit-compact');
      });
    };

    const resizeObserver = new ResizeObserver(placeButton);
    resizeObserver.observe(stage);
    resizeObserver.observe(replace);

    const replaceObserver = new MutationObserver(placeButton);
    replaceObserver.observe(replace, {
      attributes: true,
      attributeFilter: ['style', 'hidden'],
    });

    const bodyObserver = new MutationObserver(placeButton);
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
    });

    window.addEventListener('resize', placeButton, { passive: true });
    placeButton();

    button.addEventListener('click', async () => {
      if (!document.body.classList.contains('has-img') || document.body.classList.contains('batch-mode') || !canvas.width || !canvas.height) return;
      button.disabled = true;
      try {
        const blob = await canvasBlob(canvas);
        const response = await sendRuntimeMessage({
          cmd: 'lp-open-web-editor',
          file: blob,
          name: 'image.png',
          source: productSource(),
        });
        if (!response?.ok) throw new Error(response?.error || 'Transfer failed');
      } catch (error) {
        console.warn('[LayerPorter edit bridge] direct transfer unavailable, opening manual editor', error);
        fallbackOpen();
      } finally {
        button.disabled = false;
      }
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else queueMicrotask(install);
}

function senderOrigin(sender) {
  try {
    if (sender?.origin) return String(sender.origin);
    return new URL(sender?.url || '').origin;
  } catch {
    return '';
  }
}

function installServiceWorkerBridge() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.cmd !== 'lp-open-web-editor') return false;
    (async () => {
      try {
        const blob = message.file;
        if (!(blob instanceof Blob) || !blob.size || !String(blob.type || '').startsWith('image/')) throw new Error('Invalid image payload');
        const token = await putAsset(blob, message.name || 'image.png');
        const url = new URL(editBaseUrl());
        url.searchParams.set('lp_edit_token', token);
        url.searchParams.set('lp_extension_id', chrome.runtime.id);
        url.searchParams.set('lp_source', message.source || productSource());
        await chrome.tabs.create({ url: url.toString(), active: true });
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  });

  chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'LP_IMAGE_EDITOR_PULL') return false;
    (async () => {
      try {
        if (senderOrigin(sender) !== EDIT_ORIGIN || message.origin !== EDIT_ORIGIN) throw new Error('Untrusted origin');
        const entry = await takeAsset(message.token);
        if (!entry?.blob) throw new Error('Transfer token is missing or expired');
        sendResponse({ ok: true, file: entry.blob, name: entry.name, type: entry.type });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  });
}

if (typeof document === 'undefined') installServiceWorkerBridge();
else installEditorButton();
