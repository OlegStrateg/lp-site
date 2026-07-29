// JPG(s) -> PDF worker. The main thread only decodes each File into an
// ImageBitmap (cheap, browser-native, off-main-thread already) and transfers
// the bitmaps here. Everything CPU-heavy — re-encoding each bitmap to a
// baseline JPEG via OffscreenCanvas, then assembling the PDF container —
// happens in this worker, off the main thread, same division of labour as
// the PSD engines.
import { buildPdfFromJpegImages, type PdfImageInput } from './buildPdf';

const JPG_QUALITY = 0.92; // same quality constant psdToImage.worker.ts uses for its JPG branch

interface ConvertRequest {
  type: 'convert';
  bitmaps: ImageBitmap[];
}

interface ConvertSuccess {
  type: 'success';
  buffer: ArrayBuffer;
  pageCount: number;
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
  const { bitmaps } = event.data;

  if (typeof OffscreenCanvas === 'undefined') {
    postError(
      'unsupported_browser',
      'This browser cannot encode images in a background thread. Please use a current version of Chrome, Edge, Firefox, or Safari.',
    );
    return;
  }

  try {
    const images: PdfImageInput[] = [];
    for (const bitmap of bitmaps) {
      // Cache dimensions BEFORE close() — Chromium zeroes width/height on a
      // closed ImageBitmap, which silently produced 0x0 PDF pages here until
      // caught by a live end-to-end test (the node smoke gate fabricates
      // width/height directly, so it never exercised this bitmap lifecycle).
      const { width, height } = bitmap;
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2d context unavailable in OffscreenCanvas');
      // PNG input can carry alpha; JPEG (and this writer's DCTDecode embed)
      // cannot. Paint white first so a transparent PNG doesn't turn black —
      // canvas composites transparent pixels onto black once flattened to JPEG.
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();

      // Re-encoding through canvas (rather than passing the original file
      // bytes straight through) guarantees a baseline SOF0, 8-bit, DeviceRGB
      // JPEG on every page: it normalizes EXIF orientation and folds any
      // CMYK/grayscale/progressive source JPEG into the one shape buildPdf's
      // DCTDecode embed expects — at the cost of one JPEG generation of loss,
      // same tradeoff the rest of this codebase already makes (see
      // psdToImage.worker.ts's JPG branch).
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPG_QUALITY });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      images.push({ width, height, bytes });
    }

    const buffer = buildPdfFromJpegImages(images);

    const message: ConvertSuccess = {
      type: 'success',
      buffer,
      pageCount: images.length,
      durationMs: Math.round(performance.now() - started),
    };
    (self as unknown as Worker).postMessage(message, [buffer]);
  } catch (err) {
    postError('unknown', err instanceof Error ? err.message : String(err));
  }
};
