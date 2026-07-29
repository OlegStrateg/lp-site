// Image -> favicon set worker. Produces PNGs at every standard favicon/touch
// icon/PWA-icon size, packs the three smallest into one .ico (per-size PNG
// data, no BMP re-encoding needed — see buildIco.ts), and zips the full set.
// All resizing happens in OffscreenCanvas, off the main thread.
import { zipSync } from 'fflate';
import { buildIco } from './buildIco';

// Sizes per the engine plan. 16/32/48 also go into favicon.ico (the sizes
// Windows/browsers actually look for inside an .ico); 180 is the Apple
// touch-icon size, 192/512 are the Android/PWA manifest sizes — those three
// ship as standalone PNGs only, matching how every real site serves them.
const ICO_SIZES = [16, 32, 48] as const;
const PNG_ONLY_SIZES = [180, 192, 512] as const;
const ALL_SIZES = [...ICO_SIZES, ...PNG_ONLY_SIZES] as const;

interface ConvertRequest {
  type: 'convert';
  bitmap: ImageBitmap;
}

interface SizeResult {
  size: number;
  buffer: ArrayBuffer;
}

interface ConvertSuccess {
  type: 'success';
  zipBuffer: ArrayBuffer;
  previews: SizeResult[]; // one PNG per ALL_SIZES entry, for inline <img> preview
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
    // Center-crop to the largest square from the source — resizing a
    // non-square source to a square icon without cropping would stretch it.
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;

    const pngBySize = new Map<number, Uint8Array>();
    for (const size of ALL_SIZES) {
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2d context unavailable in OffscreenCanvas');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      pngBySize.set(size, new Uint8Array(await blob.arrayBuffer()));
    }
    bitmap.close();

    const icoBytes = buildIco(
      ICO_SIZES.map((size) => ({ width: size, height: size, pngBytes: pngBySize.get(size)! })),
    );

    // Names follow the convention most sites/tools already use (matches what
    // realfavicongenerator.net and favicon.io ship, so pasted <link> tags and
    // manifest.json entries from other guides still resolve to these files).
    const zipInput: Record<string, Uint8Array> = { 'favicon.ico': icoBytes };
    for (const size of ALL_SIZES) {
      const name =
        size === 180
          ? 'apple-touch-icon.png'
          : size === 192 || size === 512
            ? `android-chrome-${size}x${size}.png`
            : `favicon-${size}x${size}.png`;
      zipInput[name] = pngBySize.get(size)!;
    }
    const zipBytes = zipSync(zipInput, { level: 6 });
    const zipBuffer = zipBytes.buffer.slice(
      zipBytes.byteOffset,
      zipBytes.byteOffset + zipBytes.byteLength,
    ) as ArrayBuffer;

    const previews: SizeResult[] = ALL_SIZES.map((size) => {
      const bytes = pngBySize.get(size)!;
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      return { size, buffer: buf };
    });

    const message: ConvertSuccess = {
      type: 'success',
      zipBuffer,
      previews,
      durationMs: Math.round(performance.now() - started),
    };
    (self as unknown as Worker).postMessage(
      message,
      [zipBuffer, ...previews.map((p) => p.buffer)],
    );
  } catch (err) {
    postError('unknown', err instanceof Error ? err.message : String(err));
  }
};
