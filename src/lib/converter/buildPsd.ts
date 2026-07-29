// Shared PSD assembly — imported by BOTH the production worker and the node
// smoke gate (scripts/smoke-agpsd.mjs), so the smoke test exercises the real
// product code path (this is why the ArrayBuffer packaging lives here too).
//
// Notes carried over from the spike:
// - initializeCanvas takes TWO arguments: (createCanvas, createImageData).
//   The write-only path never creates a canvas; a pure-JS createImageData shim
//   is all ag-psd needs, in the browser worker and in node alike.
// - psd.imageData must hold the SAME composite pixels as the single layer,
//   otherwise third-party PSD viewers/thumbnailers show an empty preview.
// - writePsd returns an ArrayBuffer directly (verified: instanceof ArrayBuffer).
import { writePsd, initializeCanvas } from 'ag-psd';

initializeCanvas(
  () => {
    throw new Error('canvas creation is not used in the write-only path');
  },
  (width: number, height: number) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  }),
);

export const DEFAULT_PPI = 72;

export interface BuildPsdInput {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  fileName?: string;
}

export interface BuildPsdResult {
  buffer: ArrayBuffer;
  layerCount: number;
}

export function buildPsdBuffer({ width, height, data, fileName }: BuildPsdInput): BuildPsdResult {
  const imageData = { width, height, data } as unknown as ImageData;

  const psd = {
    width,
    height,
    imageResources: {
      resolutionInfo: {
        horizontalResolution: DEFAULT_PPI,
        horizontalResolutionUnit: 'PPI' as const,
        widthUnit: 'Inches' as const,
        verticalResolution: DEFAULT_PPI,
        verticalResolutionUnit: 'PPI' as const,
        heightUnit: 'Inches' as const,
      },
    },
    imageData,
    children: [
      {
        name: fileName || 'Layer 1',
        imageData,
      },
    ],
  };

  const buffer = writePsd(psd as Parameters<typeof writePsd>[0], {
    generateThumbnail: false,
  }) as unknown as ArrayBuffer;

  return { buffer, layerCount: psd.children.length };
}
