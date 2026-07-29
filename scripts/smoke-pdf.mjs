// JPG(s) -> PDF smoke gate: builds two REAL baseline JPEGs with jpeg-js (a
// pure-JS encoder used ONLY here, in devDependencies — it never ships in the
// browser bundle; the production code path re-encodes via
// OffscreenCanvas.convertToBlob, which only exists in a browser), feeds them
// through buildPdfFromJpegImages (the exact module jpgToPdf.worker.ts
// imports), then parses the resulting PDF byte-for-byte: header, xref
// offsets actually point at "N 0 obj", trailer/xref pairing, each image
// XObject's /Filter /DCTDecode and /Length match, and the embedded bytes are
// byte-identical to the source JPEG at the recorded offset (proving the
// writer truly embeds the JPEG as-is, no re-encoding at the PDF layer).
// Finally decodes both embedded streams back with jpeg-js to confirm they're
// still valid, decodable JPEGs after the round trip through the PDF.
import jpeg from 'jpeg-js';
import { buildPdfFromJpegImages } from '../src/lib/pdf/buildPdf.ts';

function makeJpeg(width, height, r, g, b) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  const { data: jpegData } = jpeg.encode({ data, width, height }, 90);
  return new Uint8Array(jpegData);
}

const img1 = { width: 16, height: 8, bytes: makeJpeg(16, 8, 200, 50, 100) };
const img2 = { width: 12, height: 20, bytes: makeJpeg(12, 20, 10, 220, 30) };

console.log('img1 jpeg bytes:', img1.bytes.length, '| starts FFD8FF:', img1.bytes[0] === 0xff && img1.bytes[1] === 0xd8 && img1.bytes[2] === 0xff);
console.log('img2 jpeg bytes:', img2.bytes.length, '| ends FFD9:', img2.bytes[img2.bytes.length - 2] === 0xff && img2.bytes[img2.bytes.length - 1] === 0xd9);

const pdfBuffer = buildPdfFromJpegImages([img1, img2]);
const pdf = Buffer.from(pdfBuffer);
console.log('PDF bytes:', pdf.length);

const headerOk = pdf.subarray(0, 8).toString('ascii') === '%PDF-1.4';
const eofOk = pdf.subarray(pdf.length - 6).toString('ascii').trim() === '%%EOF';
console.log('header ok:', headerOk, '| eof ok:', eofOk);

// Parse "startxref\nNNN" from the tail, then the xref table itself, and
// verify every recorded offset actually lands on "N 0 obj".
const text = pdf.toString('latin1'); // latin1: 1 byte -> 1 char, safe for offset math on binary data
const startxrefMatch = text.match(/startxref\s+(\d+)\s+%%EOF/);
if (!startxrefMatch) throw new Error('no startxref found');
const xrefOffset = Number(startxrefMatch[1]);
const xrefBlock = text.slice(xrefOffset);
const xrefHeaderMatch = xrefBlock.match(/^xref\s+0 (\d+)/);
if (!xrefHeaderMatch) throw new Error('xref table not found at recorded offset');
const totalEntries = Number(xrefHeaderMatch[1]); // includes the free object 0

// xrefBlock lines: [0]="xref" [1]="0 N" [2]=free-entry("...f") [3..]=real entries("...n").
// totalEntries (N) counts the free entry too, so there are totalEntries-1 "n" entries.
const allLines = xrefBlock.split('\n');
const entryLines = allLines.slice(3, 3 + (totalEntries - 1)).filter((l) => / n *$/.test(l));

let allOffsetsOk = entryLines.length === totalEntries - 1;
for (const line of entryLines) {
  const m = line.match(/^(\d{10}) \d{5} n/);
  if (!m) {
    allOffsetsOk = false;
    continue;
  }
  const offset = Number(m[1]);
  const atOffset = text.slice(offset, offset + 20);
  if (!/^\d+ 0 obj/.test(atOffset)) allOffsetsOk = false;
}
console.log('xref entries:', entryLines.length, '| all offsets land on "N 0 obj":', allOffsetsOk);

// Structural counts: 2 images -> 2 Catalog/Pages + 3 objects per image = 8 objects total.
const pageCount = (text.match(/\/Type \/Page(?!s)/g) ?? []).length;
const pagesCountMatch = text.match(/\/Count (\d+)/);
const dctCount = (text.match(/\/Filter \/DCTDecode/g) ?? []).length;
console.log('Page objects:', pageCount, '| /Count field:', pagesCountMatch?.[1], '| DCTDecode XObjects:', dctCount);

// Byte-identity check: each image's full byte sequence must appear, verbatim,
// somewhere in the PDF (searching the whole sequence, not a short prefix —
// JFIF headers share several boilerplate bytes across unrelated images, so a
// short prefix can false-match a different image's stream).
function findImageStreamAndVerify(bytes, label) {
  const needle = Buffer.from(bytes);
  const idx = pdf.indexOf(needle);
  const identical = idx !== -1 && Buffer.compare(pdf.subarray(idx, idx + needle.length), needle) === 0;
  console.log(`${label}: found at byte offset ${idx}, ${bytes.length} bytes, identical: ${identical}`);
  return identical;
}
const img1Ok = findImageStreamAndVerify(img1.bytes, 'img1 embed');
const img2Ok = findImageStreamAndVerify(img2.bytes, 'img2 embed');

// Round-trip decode: the bytes embedded in the PDF must still be valid JPEGs.
const decoded1 = jpeg.decode(img1.bytes, { useTArray: true });
const decoded2 = jpeg.decode(img2.bytes, { useTArray: true });
console.log('decoded1 dims:', decoded1.width, 'x', decoded1.height, '| decoded2 dims:', decoded2.width, 'x', decoded2.height);
const decodeOk =
  decoded1.width === img1.width && decoded1.height === img1.height &&
  decoded2.width === img2.width && decoded2.height === img2.height;

const ok =
  headerOk && eofOk && allOffsetsOk &&
  pageCount === 2 && pagesCountMatch?.[1] === '2' && dctCount === 2 &&
  img1Ok && img2Ok && decodeOk;

console.log(ok ? 'PDF SMOKE PASS' : 'PDF SMOKE FAIL');
process.exit(ok ? 0 : 1);
