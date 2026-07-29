// Hand-rolled .ico writer (~50 lines, per plan) — no dependency needed. The
// ICO format is a 6-byte ICONDIR header, one 16-byte ICONDIRENTRY per image,
// then the raw image bytes back to back. Since Windows Vista an ICONDIRENTRY
// may point straight at a PNG file instead of a legacy BMP/AND-mask pair —
// that's what this writer emits (PNG-in-ICO), so no BMP encoding is needed at
// all: the same PNG bytes the favicon worker already produced via
// OffscreenCanvas.convertToBlob('image/png') go in verbatim.
export interface IcoImageInput {
  width: number; // <= 256 for every entry used here (16/32/48)
  height: number;
  /** Encoded PNG bytes for this size. */
  pngBytes: Uint8Array;
}

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

export function buildIco(images: IcoImageInput[]): Uint8Array {
  if (images.length === 0) throw new Error('no_images');

  const headerSize = 6;
  const entrySize = 16;
  const dataStart = headerSize + entrySize * images.length;

  const header = new Uint8Array(headerSize);
  const view = new DataView(header.buffer);
  view.setUint16(0, 0, true); // reserved, must be 0
  view.setUint16(2, 1, true); // type: 1 = icon
  view.setUint16(4, images.length, true); // image count

  const entries = new Uint8Array(entrySize * images.length);
  const entriesView = new DataView(entries.buffer);
  let offset = dataStart;
  images.forEach((img, i) => {
    const base = i * entrySize;
    // width/height byte fields: 0 means "256". None of our sizes hit that here.
    entriesView.setUint8(base + 0, img.width >= 256 ? 0 : img.width);
    entriesView.setUint8(base + 1, img.height >= 256 ? 0 : img.height);
    entriesView.setUint8(base + 2, 0); // color count: 0 = not palette-based
    entriesView.setUint8(base + 3, 0); // reserved
    entriesView.setUint16(base + 4, 1, true); // color planes: 1 for PNG entries
    entriesView.setUint16(base + 6, 32, true); // bits per pixel: 32 (RGBA)
    entriesView.setUint32(base + 8, img.pngBytes.length, true); // BytesInRes
    entriesView.setUint32(base + 12, offset, true); // ImageOffset
    offset += img.pngBytes.length;
  });

  return concatBytes([header, entries, ...images.map((img) => img.pngBytes)]);
}
