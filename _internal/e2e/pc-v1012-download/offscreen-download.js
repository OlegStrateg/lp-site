const DOWNLOAD_TARGET = "lp-download-offscreen";
const REVOKE_DELAY_MS = 1500;

function safeFilename(value) {
  const name = String(value || "image.bin")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .trim();
  return (name || "image.bin").slice(0, 180);
}

function clickDownload(href, filename, revoke) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = safeFilename(filename);
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    if (revoke) setTimeout(() => URL.revokeObjectURL(href), REVOKE_DELAY_MS);
  }
}

async function handleDownload(message) {
  if (message.type === "download-blob") {
    if (!(message.blob instanceof Blob) || !message.blob.size) {
      return { ok: false, code: "blob_unavailable", error: "Blob messaging unavailable" };
    }
    const url = URL.createObjectURL(message.blob);
    clickDownload(url, message.filename, true);
    return { ok: true, mode: "blob" };
  }
  if (
    message.type === "download-data-url"
    && typeof message.dataUrl === "string"
    && message.dataUrl.startsWith("data:")
  ) {
    clickDownload(message.dataUrl, message.filename, false);
    return { ok: true, mode: "data-url" };
  }
  return { ok: false, code: "invalid_payload", error: "Invalid download payload" };
}

let queue = Promise.resolve();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== DOWNLOAD_TARGET) return false;
  queue = queue.catch(() => {}).then(() => handleDownload(message));
  queue
    .then(sendResponse)
    .catch((error) => sendResponse({
      ok: false,
      code: "download_failed",
      error: String(error?.message || error),
    }));
  return true;
});
