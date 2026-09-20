const OFFSCREEN_DOWNLOAD_PATH = "offscreen-download.html";
let offscreenDownloadCreating = null;

async function blobToBase64(blob) {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function ensureDownloadOffscreen() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOWNLOAD_PATH);
  let exists = false;
  if (typeof chrome.runtime.getContexts === "function") {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl],
    });
    exists = contexts.length > 0;
  } else if (typeof clients !== "undefined" && clients.matchAll) {
    const matched = await clients.matchAll();
    exists = matched.some((client) => client.url === offscreenUrl);
  }
  if (exists) return;
  if (offscreenDownloadCreating) {
    await offscreenDownloadCreating;
    return;
  }
  offscreenDownloadCreating = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOWNLOAD_PATH,
    reasons: ["BLOBS"],
    justification: "Save converted images with a normal browser download without access to download history.",
  });
  try {
    await offscreenDownloadCreating;
  } finally {
    offscreenDownloadCreating = null;
  }
}

async function sendOffscreenDownload(message) {
  await ensureDownloadOffscreen();
  const response = await chrome.runtime.sendMessage({
    target: "lp-download-offscreen",
    ...message,
  });
  return response || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function closeDownloadOffscreen() {
  try {
    await chrome.offscreen.closeDocument();
  } catch {}
}

async function saveConvertedBlobOnce(blob, filename) {
  try {
    let response = null;
    try {
      response = await sendOffscreenDownload({ type: "download-blob", blob, filename });
    } catch {
      response = null;
    }
    if (response?.ok) return response;

    const b64 = await blobToBase64(blob);
    const dataUrl = `data:${blob.type || "application/octet-stream"};base64,${b64}`;
    response = await sendOffscreenDownload({ type: "download-data-url", dataUrl, filename });
    if (!response?.ok) throw new Error(response?.error || "Browser download failed");
    return response;
  } finally {
    // Give Chrome time to take ownership of the navigation/download before
    // destroying the document that owns the Blob URL.
    await delay(300);
    await closeDownloadOffscreen();
  }
}

let saveQueue = Promise.resolve();

function saveConvertedBlob(blob, filename) {
  const task = saveQueue
    .catch(() => {})
    .then(() => saveConvertedBlobOnce(blob, filename));
  saveQueue = task.catch(() => {});
  return task;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.cmd === "test-save") {
    const size = Number(msg.size || 1024);
    const seed = Number(msg.seed || 17) & 255;
    const bytes = new Uint8Array(size);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (seed + i * 31) & 255;
    const blob = new Blob([bytes], { type: msg.mime || "application/octet-stream" });
    saveConvertedBlob(blob, msg.filename)
      .then((result) => sendResponse({ ok: true, mode: result?.mode || "unknown", size }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.stack || error) }));
    return true;
  }

  if (msg?.cmd === "test-data-url") {
    sendOffscreenDownload({
      type: "download-data-url",
      dataUrl: "data:application/octet-stream;base64,AQIDBAUGBwg=",
      filename: msg.filename || "legacy.bin",
    })
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: String(error?.stack || error) }));
    return true;
  }

  if (msg?.cmd === "test-warnings") {
    chrome.management.getPermissionWarningsByManifest(JSON.stringify(chrome.runtime.getManifest()))
      .then((warnings) => sendResponse({ ok: true, warnings }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
});
