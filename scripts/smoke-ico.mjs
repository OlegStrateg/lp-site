// Favicon .ico writer smoke gate: builds real, valid PNGs (same minimal
// hand-rolled encoder as scripts/generate-og-image.mjs — deflate via Node's
// zlib, no dependency), packs them through buildIco (the exact module
// favicon.worker.ts imports), then parses the resulting .ico byte-for-byte:
// ICONDIR header (reserved/type/count), each ICONDIRENTRY's width/height/
// byte-count/offset fields, and that every offset actually lands on a valid
// PNG signature with the recorded length.
import { deflateSync } from 'node:zlib';
import { buildIco } from '../src/lib/ico/buildIco.ts';

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB (no alpha, keeps this helper simple)
  const ihdr = chunk('IHDR', ihdrData);
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const o = y * (stride + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const idat = chunk('IDAT', deflateSync(raw, { level: 9 }));
  const iend = chunk('IEND', Buffer.alloc(0));
  return new Uint8Array(Buffer.concat([signature, ihdr, idat, iend]));
}

const sizes = [16, 32, 48];
const images = sizes.map((size, i) => ({
  width: size,
  height: size,
  pngBytes: makePng(size, size, 50 + i * 40, 100, 150),
}));

const icoBytes = buildIco(images);
const ico = Buffer.from(icoBytes);
console.log('ico bytes:', ico.length);

const reserved = ico.readUInt16LE(0);
const type = ico.readUInt16LE(2);
const count = ico.readUInt16LE(4);
console.log('reserved:', reserved, '| type:', type, '| count:', count);

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
let entriesOk = count === images.length && reserved === 0 && type === 1;
let expectedOffset = 6 + 16 * images.length;
for (let i = 0; i < images.length; i++) {
  const base = 6 + i * 16;
  const width = ico.readUInt8(base + 0);
  const height = ico.readUInt8(base + 1);
  const planes = ico.readUInt16LE(base + 4);
  const bpp = ico.readUInt16LE(base + 6);
  const bytesInRes = ico.readUInt32LE(base + 8);
  const imageOffset = ico.readUInt32LE(base + 12);
  const sigOk = Buffer.compare(ico.subarray(imageOffset, imageOffset + 8), PNG_SIG) === 0;
  const lenOk = bytesInRes === images[i].pngBytes.length;
  const offsetOk = imageOffset === expectedOffset;
  console.log(
    `entry ${i}: ${width}x${height} planes=${planes} bpp=${bpp} bytes=${bytesInRes} offset=${imageOffset}`,
    `| sig ok: ${sigOk} | len ok: ${lenOk} | offset ok: ${offsetOk}`,
  );
  if (width !== sizes[i] || height !== sizes[i] || !sigOk || !lenOk || !offsetOk) entriesOk = false;
  expectedOffset += images[i].pngBytes.length;
}
const totalLenOk = ico.length === expectedOffset;
console.log('total length matches sum of parts:', totalLenOk, `(${ico.length} vs ${expectedOffset})`);

const ok = entriesOk && totalLenOk;
console.log(ok ? 'ICO SMOKE PASS' : 'ICO SMOKE FAIL');
process.exit(ok ? 0 : 1);
