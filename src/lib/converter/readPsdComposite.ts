// Shared PSD read path — imported by BOTH the production psdToImage.worker and
// the node smoke gate (scripts/smoke-agpsd.mjs), so the smoke test exercises the
// real read-path product code, mirroring how buildPsd.ts is shared with the
// write-path worker + smoke gate.
//
// Fact-checked (16.07): readPsd with `useImageData: true` needs ONLY the pure-JS
// createImageData shim below — no canvas at all (readPsd without that flag
// throws asking for one). OffscreenCanvas is needed only for ENCODING the
// composite to PNG/JPG, which happens in the worker after this module returns.
import { readPsd, initializeCanvas } from 'ag-psd';

initializeCanvas(
  () => {
    throw new Error('createCanvas must not be reached: readPsd is called with useImageData');
  },
  (width: number, height: number) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  }),
);

export interface PsdComposite {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  layerCount: number;
}

/** Reads a PSD ArrayBuffer and returns its flattened composite pixels + dimensions. */
export function readPsdComposite(buffer: ArrayBuffer): PsdComposite {
  // Composite only: layer pixels are not needed to export a flat PNG/JPG.
  const psd = readPsd(buffer, {
    useImageData: true,
    skipLayerImageData: true,
    skipThumbnail: true,
  });

  const composite = psd.imageData as unknown as
    | { width: number; height: number; data: Uint8ClampedArray }
    | undefined;
  if (!composite || !composite.data || composite.data.length === 0) {
    throw new Error('no_composite');
  }

  return {
    width: composite.width,
    height: composite.height,
    data: composite.data,
    layerCount: psd.children?.length ?? 0,
  };
}

/** JPEG has no alpha: composite over a white background, pixel by pixel. */
export function flattenOnWhite(pixels: Uint8ClampedArray): Uint8ClampedArray {
  const flat = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3] / 255;
    flat[i] = pixels[i] * a + 255 * (1 - a);
    flat[i + 1] = pixels[i + 1] * a + 255 * (1 - a);
    flat[i + 2] = pixels[i + 2] * a + 255 * (1 - a);
    flat[i + 3] = 255;
  }
  return flat;
}
