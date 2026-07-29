// PSD -> PNG/JPG worker (wave 2 read path). Separate chunk — deliberately does
// NOT import buildPsd.ts so the write-only pilot worker stays lean.
//
// Fact-checked division of labour (verified in node, 16.07):
// - readPsd with `useImageData: true` needs ONLY the pure-JS createImageData
//   shim — no canvas at all (readPsd without that flag throws asking for one).
//   That parsing step lives in readPsdComposite.ts, shared with the node smoke
//   gate so the read path gets the same real-code-path coverage as the write path.
// - OffscreenCanvas is required solely for ENCODING the composite to PNG/JPG
//   via convertToBlob. No OffscreenCanvas -> honest `unsupported_browser`.
import { readPsdComposite, flattenOnWhite } from './readPsdComposite';

const JPG_QUALITY = 0.92;

interface ConvertRequest {
  type: 'convert';
  buffer: ArrayBuffer;
  output: 'png' | 'jpg';
  fileName: string;
}

interface ConvertSuccess {
  type: 'success';
  buffer: ArrayBuffer;
  mime: string;
  width: number;
  height: number;
  layerCount: number;
  durationMs: number;
  // Real alpha-channel scan, PNG output only (JPG is always opaque -- see
  // flattenOnWhite). Cheap: the composite RGBA is already in memory before
  // this scan, so it's one extra pass over pixels already decoded, not a
  // second read or decode.
  hasAlpha?: boolean;
}

interface ConvertError {
  type: 'error';
  reason: string;
  message: string;
}

function postError(reason: string, message: string): void {
  const msg: ConvertError = { type: 'error', reason, message };
  (self as unknown as Worker).postMessage(msg);
}

self.onmessage = async (event: MessageEvent<ConvertRequest>) => {
  const started = performance.now();
  const { buffer, output } = event.data;

  if (typeof OffscreenCanvas === 'undefined') {
    postError(
      'unsupported_browser',
      'This browser cannot encode images in a background thread. Please use a current version of Chrome, Edge, Firefox, or Safari.',
    );
    return;
  }

  try {
    let composite;
    try {
      composite = readPsdComposite(buffer);
    } catch {
      postError(
        'no_composite',
        'This PSD has no flattened preview (it was saved without "Maximize Compatibility"). Re-save it with that option enabled and try again.',
      );
      return;
    }

    const { width, height, layerCount } = composite;
    const pixels = output === 'jpg' ? flattenOnWhite(composite.data) : composite.data;

    let hasAlpha: boolean | undefined;
    if (output === 'png') {
      hasAlpha = false;
      for (let i = 3; i < composite.data.length; i += 4) {
        if (composite.data[i] < 255) {
          hasAlpha = true;
          break;
        }
      }
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable in OffscreenCanvas');
    ctx.putImageData(new ImageData(pixels, width, height), 0, 0);

    const mime = output === 'jpg' ? 'image/jpeg' : 'image/png';
    const blob = await canvas.convertToBlob(
      output === 'jpg' ? { type: mime, quality: JPG_QUALITY } : { type: mime },
    );
    const outBuffer = await blob.arrayBuffer();

    const message: ConvertSuccess = {
      type: 'success',
      buffer: outBuffer,
      mime,
      width,
      height,
      layerCount,
      hasAlpha,
      durationMs: Math.round(performance.now() - started),
    };
    (self as unknown as Worker).postMessage(message, [outBuffer]);
  } catch (err) {
    postError('unknown', err instanceof Error ? err.message : String(err));
  }
};
