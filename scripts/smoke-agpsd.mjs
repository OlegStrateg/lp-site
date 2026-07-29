// Round-trip smoke gate: buildPsdBuffer (REAL product code, same module the
// write-path worker imports) -> readPsd, asserting ArrayBuffer type, alpha,
// dimensions, DPI and colorMode. Then a SECOND round trip through
// readPsdComposite/flattenOnWhite (REAL product code, same module the
// read-path psdToImage.worker imports), asserting the composite pixels and
// dimensions the read path would hand to OffscreenCanvas. Runs before every
// `npm run build`.
//
// Node 24 strips TypeScript types natively, so importing the product .ts
// modules directly works without a build step.
import { readPsd } from 'ag-psd';
import { buildPsdBuffer, DEFAULT_PPI } from '../src/lib/converter/buildPsd.ts';
import { readPsdComposite, flattenOnWhite } from '../src/lib/converter/readPsdComposite.ts';

const W = 64, H = 32;
const data = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) {
  data[i * 4] = 200;      // R
  data[i * 4 + 1] = 50;   // G
  data[i * 4 + 2] = 100;  // B
  data[i * 4 + 3] = i % 2 ? 255 : 77; // alpha: alternate 255/77
}

const { buffer, layerCount } = buildPsdBuffer({ width: W, height: H, data, fileName: 'smoke.png' });
console.log('written bytes:', buffer.byteLength, '| layerCount:', layerCount);
console.log('buffer instanceof ArrayBuffer:', buffer instanceof ArrayBuffer);

const back = readPsd(buffer, { useImageData: true, skipCompositeImageData: false });
console.log('dims:', back.width, 'x', back.height, '| colorMode:', back.colorMode, '| bits:', back.bitsPerChannel, '| channels:', back.channels);
console.log('DPI:', JSON.stringify(back.imageResources?.resolutionInfo));
const layer = back.children[0];
console.log('layer name:', layer.name, '| layer dims:', layer.right - layer.left, 'x', layer.bottom - layer.top);
const ld = layer.imageData.data;
console.log('pixel0 RGBA:', ld[0], ld[1], ld[2], ld[3], '| pixel1 alpha:', ld[7]);
const writeOk =
  buffer instanceof ArrayBuffer &&
  layerCount === 1 &&
  back.width === W && back.height === H &&
  back.bitsPerChannel === 8 && back.colorMode === 3 /* RGB */ &&
  back.imageResources?.resolutionInfo?.horizontalResolution === DEFAULT_PPI &&
  layer.name === 'smoke.png' &&
  ld[0] === 200 && ld[1] === 50 && ld[2] === 100 && ld[3] === 77 && ld[7] === 255;
console.log(writeOk ? 'WRITE-PATH SMOKE PASS' : 'WRITE-PATH SMOKE FAIL');

// ---- read path: the SAME buffer just written, read back through the exact
// module psdToImage.worker.ts imports (readPsdComposite), then through
// flattenOnWhite (the JPG-branch helper). Verifies dimensions + pixels only —
// PNG/JPG encoding itself needs OffscreenCanvas, which node does not have.
const composite = readPsdComposite(buffer);
console.log('composite dims:', composite.width, 'x', composite.height, '| layerCount:', composite.layerCount);
const cd = composite.data;
console.log('composite pixel0 RGBA:', cd[0], cd[1], cd[2], cd[3], '| pixel1 alpha:', cd[7]);

const flattened = flattenOnWhite(composite.data);
// pixel0 alpha=77/255; expected = channel*a + 255*(1-a), Uint8ClampedArray rounds.
// Based on the actual composite values (cd), which may drift ±1 from the
// source RGB (see tolerance note above), not the raw input constants.
const a0 = cd[3] / 255;
const expectedR0 = Math.round(cd[0] * a0 + 255 * (1 - a0));
const expectedG0 = Math.round(cd[1] * a0 + 255 * (1 - a0));
const expectedB0 = Math.round(cd[2] * a0 + 255 * (1 - a0));
console.log('flattened pixel0 RGBA:', flattened[0], flattened[1], flattened[2], flattened[3], '| expected RGB:', expectedR0, expectedG0, expectedB0);

// ag-psd stores the composite premultiplied-then-unpremultiplied internally,
// which introduces ±1 rounding drift vs the source RGB — tolerate that, but
// alpha (not premultiplied) must round-trip exactly.
const readOk =
  composite.width === W && composite.height === H &&
  composite.layerCount === 1 &&
  Math.abs(cd[0] - 200) <= 1 && Math.abs(cd[1] - 50) <= 1 && Math.abs(cd[2] - 100) <= 1 &&
  cd[3] === 77 && cd[7] === 255 &&
  flattened[3] === 255 && // JPEG branch always fully opaque
  Math.abs(flattened[0] - expectedR0) <= 1 &&
  Math.abs(flattened[1] - expectedG0) <= 1 &&
  Math.abs(flattened[2] - expectedB0) <= 1;
console.log(readOk ? 'READ-PATH SMOKE PASS' : 'READ-PATH SMOKE FAIL');

const ok = writeOk && readOk;
console.log(ok ? 'SMOKE PASS' : 'SMOKE FAIL');
process.exit(ok ? 0 : 1);
