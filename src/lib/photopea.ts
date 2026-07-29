// Shared "Open in Photopea" helper — extracted from ConverterWidgetV2 (the
// png-to-psd pilot) so the same real, live-tested mechanism can be reused by
// any widget whose output is a PSD (today: ConverterWidgetV2 itself, and
// ConverterWidget's raster->psd path on jpg-to-psd, gated by content's
// `continuePhotopea` flag — see ConverterLayout.astro).
//
// Live-tested against the real photopea.com (19.07): opening
// window.open('https://www.photopea.com') lands on a marketing page, not the
// editor -- it only shows the app after a manual "Start using Photopea"
// click, and that top-level window does not answer a window.opener
// postMessage handshake (the documented Live Messaging API is for an iframe
// embed, which this project's CSP frame-src doesn't allow). The URL hash
// config Photopea DOES document (#%7B%22files%22:[...]%7D, data URIs
// allowed) verifiably opens straight into the editor with the file loaded,
// confirmed via a real load with a <canvas> present immediately, no extra
// click. That's what this uses.
//
// The button that calls openInPhotopea should only be shown when the PSD is
// small enough to survive as a data: URI in a navigable URL -- browsers cap
// navigable URL length around ~2MB, base64 adds ~33%, and JSON +
// encodeURIComponent framing adds a bit more, so PHOTOPEA_MAX_PSD_BYTES
// keeps a safety margin under that ceiling.
export const PHOTOPEA_MAX_PSD_BYTES = 1_000_000;

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
}

/** Opens photopea.com in a new tab with the given PSD buffer pre-loaded via the URL hash config. */
export function openInPhotopea(psdBuffer: ArrayBuffer): void {
  const base64 = arrayBufferToBase64(psdBuffer);
  const dataUri = 'data:image/vnd.adobe.photoshop;base64,' + base64;
  const config = JSON.stringify({ files: [dataUri] });
  window.open('https://www.photopea.com#' + encodeURIComponent(config), '_blank');
}
