// Hand-rolled PDF writer — no dependency. Measured cost of the two obvious
// libraries (esbuild --minify + gzip, 16.07): jsPDF ~244 KB gzip, pdf-lib
// ~202 KB gzip, both far over the ~150 KB gzip budget for a single-purpose
// tool. A JPEG can be embedded in a PDF byte-for-byte via the /DCTDecode
// filter — the PDF spec lets an Image XObject's stream BE a raw JPEG, no
// re-encoding, no JPEG decode/parse needed at the PDF layer at all. That
// makes a full library pointless: this writer only needs to emit the PDF
// container (objects, xref, trailer) around bytes it's handed. Cost: ~1-2 KB
// gzip, i.e. the page's own code.
//
// Every image must already be a valid BASELINE (SOF0), 8-bit, 3-component
// (DeviceRGB) JPEG — the caller (jpgToPdf.worker.ts) guarantees this by
// re-encoding through OffscreenCanvas.convertToBlob('image/jpeg', ...), which
// also normalizes EXIF orientation and any CMYK/grayscale/progressive source
// JPEG into a plain baseline RGB JPEG. This writer does not sniff or
// validate the JPEG internals — it trusts its input, same division of
// responsibility as buildPsd.ts trusts its caller for pixel format.
export interface PdfImageInput {
  width: number;
  height: number;
  /** Encoded JPEG bytes — baseline, 8-bit, DeviceRGB (3 components). */
  bytes: Uint8Array;
}

const ASCII = new TextEncoder();

/** Concatenates byte chunks (ASCII segments and raw binary alike) into one buffer. */
function concatBytes(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Builds a multi-page PDF, one page per image, page size = image pixel size
 *  in points (1 px = 1 pt, i.e. 72 DPI — same default resolution buildPsd.ts
 *  uses for the PSD write path, kept consistent across the two engines). */
export function buildPdfFromJpegImages(images: PdfImageInput[]): ArrayBuffer {
  if (images.length === 0) throw new Error('no_images');

  const objects: Uint8Array[] = []; // index 0 is unused; objects[n] = bytes of "n 0 obj ... endobj\n"
  const N = images.length;
  const pagesObjNum = 2;

  // Object 1: Catalog
  objects[1] = ASCII.encode(`1 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj\n`);

  // Object numbers: page = 3 + i*3, content = 4 + i*3, image = 5 + i*3
  const kidsRefs: string[] = [];
  const pageObjs: Uint8Array[][] = [];
  for (let i = 0; i < N; i++) {
    const img = images[i];
    const pageNum = 3 + i * 3;
    const contentNum = 4 + i * 3;
    const imageNum = 5 + i * 3;
    kidsRefs.push(`${pageNum} 0 R`);

    const pageDict = ASCII.encode(
      `${pageNum} 0 obj\n<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 ${img.width} ${img.height}] ` +
        `/Resources << /XObject << /Im0 ${imageNum} 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`,
    );

    const contentStream = ASCII.encode(`q ${img.width} 0 0 ${img.height} 0 0 cm /Im0 Do Q`);
    const contentObj = concatBytes([
      ASCII.encode(`${contentNum} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n`),
      contentStream,
      ASCII.encode(`\nendstream\nendobj\n`),
    ]);

    const imageObj = concatBytes([
      ASCII.encode(
        `${imageNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`,
      ),
      img.bytes,
      ASCII.encode(`\nendstream\nendobj\n`),
    ]);

    pageObjs.push([pageDict, contentObj, imageObj]);
  }

  // Object 2: Pages (needs kidsRefs, built after the loop above)
  objects[pagesObjNum] = ASCII.encode(
    `${pagesObjNum} 0 obj\n<< /Type /Pages /Kids [${kidsRefs.join(' ')}] /Count ${N} >>\nendobj\n`,
  );
  for (let i = 0; i < N; i++) {
    const pageNum = 3 + i * 3;
    objects[pageNum] = pageObjs[i][0];
    objects[pageNum + 1] = pageObjs[i][1];
    objects[pageNum + 2] = pageObjs[i][2];
  }

  const totalObjects = 2 + N * 3; // highest object number
  // Header + the conventional "binary marker" comment (4 bytes >= 0x80 so
  // naive tools that sniff the first line know this file carries binary
  // data). Built as raw bytes directly — TextEncoder is UTF-8 and would
  // re-encode char codes > 0x7F into multi-byte sequences, defeating the point.
  const header = concatBytes([
    ASCII.encode('%PDF-1.4\n%'),
    new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3]),
    ASCII.encode('\n'),
  ]);

  const parts: Uint8Array[] = [header];
  const offsets: number[] = new Array(totalObjects + 1).fill(0);
  let cursor = header.length;
  for (let n = 1; n <= totalObjects; n++) {
    offsets[n] = cursor;
    parts.push(objects[n]);
    cursor += objects[n].length;
  }

  const xrefOffset = cursor;
  let xref = `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= totalObjects; n++) {
    xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer =
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  parts.push(ASCII.encode(xref));
  parts.push(ASCII.encode(trailer));

  const out = concatBytes(parts);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}
