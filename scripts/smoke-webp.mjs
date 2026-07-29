// WebP -> JPG smoke gate — HONEST PARTIAL COVERAGE, by necessity, same
// caveat the task plan called out up front: Node has no WebP decoder and no
// OffscreenCanvas, so webpToJpg.worker.ts's actual decode+encode path
// (createImageBitmap + OffscreenCanvas.convertToBlob) cannot run here at all.
// What this DOES verify with real product code:
//   1. looksLikeWebpBytes (src/lib/converter/webpSignature.ts) — the exact
//      module ConverterWidget.astro imports for format sniffing — against a
//      real WebP file's magic bytes and several rejection cases.
//   2. That a JPEG encode of a flattened (alpha-composited-onto-white)
//      RGBA buffer produces a valid, decodable baseline JPEG — the same
//      shape of output the worker's OffscreenCanvas path produces, using
//      jpeg-js (devDependency, not shipped to the browser bundle) as a
//      stand-in encoder since Node has no canvas.
// The actual decode+encode pipeline is verified manually against a live
// browser (see report) — this file does not claim to cover that.
import jpeg from 'jpeg-js';
import { looksLikeWebpBytes } from '../src/lib/converter/webpSignature.ts';

// 1. Signature checks against real product code.
const realWebpHeader = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, // RIFF....WEBP
]);
const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const truncated = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
const riffButNotWebp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20]); // RIFF....AVI (WebM/AVI RIFF cousin)

const sigChecks = {
  realWebp: looksLikeWebpBytes(realWebpHeader) === true,
  pngRejected: looksLikeWebpBytes(pngHeader) === false,
  truncatedRejected: looksLikeWebpBytes(truncated) === false,
  otherRiffRejected: looksLikeWebpBytes(riffButNotWebp) === false,
};
console.log('signature checks:', JSON.stringify(sigChecks));

// 2. JPEG-encode-of-a-flattened-composite check (stand-in for the
// OffscreenCanvas step, using jpeg-js since Node has neither WebP decode nor
// a canvas). Builds a WIDTHxHEIGHT buffer that's already "flattened onto
// white" the way the worker's ctx.fillRect(white) + drawImage would produce,
// encodes it, and decodes it back to confirm a valid baseline JPEG comes out.
const WIDTH = 20, HEIGHT = 10;
const rgba = Buffer.alloc(WIDTH * HEIGHT * 4);
for (let i = 0; i < WIDTH * HEIGHT; i++) {
  rgba[i * 4] = 30; rgba[i * 4 + 1] = 144; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = 255;
}
const { data: jpegBytes } = jpeg.encode({ data: rgba, width: WIDTH, height: HEIGHT }, 92);
const decoded = jpeg.decode(jpegBytes, { useTArray: true });
const encodeOk =
  jpegBytes[0] === 0xff && jpegBytes[1] === 0xd8 && jpegBytes[2] === 0xff &&
  decoded.width === WIDTH && decoded.height === HEIGHT;
console.log('jpeg encode/decode dims:', decoded.width, 'x', decoded.height, '| valid baseline JPEG:', encodeOk);

const ok = Object.values(sigChecks).every(Boolean) && encodeOk;
console.log(ok ? 'WEBP SMOKE PASS (partial coverage — see file header comment)' : 'WEBP SMOKE FAIL');
process.exit(ok ? 0 : 1);
