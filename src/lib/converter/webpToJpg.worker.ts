// WebP -> JPG worker. Trivial by design: the main thread already decoded the
// file into an ImageBitmap (createImageBitmap decodes WebP natively in every
// evergreen browser — no library needed for the read side either), this
// worker just draws it into an OffscreenCanvas and re-encodes as JPEG.
const JPG_QUALITY = 0.92; // same constant as the PSD read path's JPG branch

interface ConvertRequest {
  type: 'convert';
  bitmap: ImageBitmap;
}

interface ConvertSuccess {
  type: 'success';
  buffer: ArrayBuffer;
  width: number;
  height: number;
  durationMs: number;
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
  const { bitmap } = event.data;

  if (typeof OffscreenCanvas === 'undefined') {
    postError(
      'unsupported_browser',
      'This browser cannot encode images in a background thread. Please use a current version of Chrome, Edge, Firefox, or Safari.',
    );
    return;
  }

  try {
    const { width, height } = bitmap;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable in OffscreenCanvas');
    // JPEG has no alpha — paint white first so a transparent WebP doesn't
    // turn black (canvas defaults transparent pixels to black once flattened).
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPG_QUALITY });
    const buffer = await blob.arrayBuffer();

    const message: ConvertSuccess = {
      type: 'success',
      buffer,
      width,
      height,
      durationMs: Math.round(performance.now() - started),
    };
    (self as unknown as Worker).postMessage(message, [buffer]);
  } catch (err) {
    postError('unknown', err instanceof Error ? err.message : String(err));
  }
};
