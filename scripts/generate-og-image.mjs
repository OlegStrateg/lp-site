// Generates static 1200x630 OG images with zero external services/tools:
// a hand-rolled PNG encoder (zlib from Node core for IDAT compression) plus a
// tiny built-in 3x5 bitmap font for the wordmark. Output: public/og/{key}.png
// — one per converter page, so every page's og:image resolves (wave 2 yarus
// B adds 4 more converter pages; the 3 yarus C articles don't get one yet —
// out of scope for this pass, see report — so they fall back to
// BaseLayout's default og:image).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'og');

const WIDTH = 1200;
const HEIGHT = 630;

// One image per converter page. Headline mirrors each page's toolHeading/h1
// direction so the shared OG template stays honest per page.
const PAGES = [
  // Shared fallback for pages with no dedicated tool image: home, /convert/
  // hub, /about/ (SEO fix pass — these three previously fell back to
  // png-to-psd.png, which named the wrong tool on unrelated pages).
  { key: 'home', headline: 'FREE FILE CONVERTERS' },
  { key: 'png-to-psd', headline: 'PNG TO PSD CONVERTER' },
  { key: 'jpg-to-psd', headline: 'JPG TO PSD CONVERTER' },
  { key: 'psd-to-png', headline: 'PSD TO PNG CONVERTER' },
  { key: 'psd-to-jpg', headline: 'PSD TO JPG CONVERTER' },
  // 22 chars at scale 6 = 648px wide from x=130 — clears the graphic at x=830.
  { key: 'canva-to-google-slides', headline: 'CANVA TO GOOGLE SLIDES' },
  // Wave 2 (yarus B) — all under the 22-char budget above.
  { key: 'jpg-to-pdf', headline: 'JPG TO PDF CONVERTER' },
  { key: 'pdf-to-jpg', headline: 'PDF TO JPG CONVERTER' },
  { key: 'favicon-generator', headline: 'FAVICON GENERATOR' },
  { key: 'webp-to-jpg', headline: 'WEBP TO JPG CONVERTER' },
  // Wave 2 (yarus C) articles — key matches the article's content-collection
  // `key` (ArticleLayout builds the og URL from d.key). Longest is 23 chars:
  // 23*18 + 22*12 = 678px from x=130 ends at 808 — still clears the graphic
  // at x=830, so the 22-char comment above is conservative, not a hard limit.
  { key: 'what-is-a-psd-file', headline: 'WHAT IS A PSD FILE' },
  { key: 'flat-image-vs-layers', headline: 'FLAT IMAGE VS LAYERS' },
  { key: 'export-ai-builders', headline: 'EXPORT FROM AI BUILDERS' },
];

function setPixel(buf, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 4;
  // simple alpha blend over existing pixel (background is opaque, so this is
  // enough for flat shapes/text with a=255 or soft edges with a<255)
  if (a === 255) {
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    return;
  }
  const ia = 255 - a;
  buf[i] = (r * a + buf[i] * ia) / 255;
  buf[i + 1] = (g * a + buf[i + 1] * ia) / 255;
  buf[i + 2] = (b * a + buf[i + 2] * ia) / 255;
  buf[i + 3] = 255;
}

function fillRect(buf, x0, y0, w, h, [r, g, b], radius = 0) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (radius > 0) {
        // crude rounded-corner mask
        const cx = x < x0 + radius ? x0 + radius : x >= x0 + w - radius ? x0 + w - radius : x;
        const cy = y < y0 + radius ? y0 + radius : y >= y0 + h - radius ? y0 + h - radius : y;
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy > radius * radius) continue;
      }
      setPixel(buf, x, y, r, g, b);
    }
  }
}

// ---- tiny 3x5 bitmap font (uppercase subset used by this image only) ------
const GLYPHS = {
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  // M in 3 columns: differs from N (row 4 solid there) by open bottom rows.
  M: ['101', '111', '111', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  N: ['101', '111', '111', '111', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '010'],
  V: ['101', '101', '101', '010', '010'],
  W: ['101', '101', '111', '111', '101'],
  X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  J: ['001', '001', '001', '101', '010'],
  ' ': ['000', '000', '000', '000', '000'],
};

function drawText(buf, text, x, y, scale, color) {
  let cursor = x;
  const glyphW = 3 * scale;
  const gap = scale * 2;
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch] || GLYPHS[' '];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (glyph[row][col] === '1') {
          fillRect(buf, cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += glyphW + gap;
  }
  return cursor - gap; // right edge reached
}

function textWidth(text, scale) {
  const glyphW = 3 * scale;
  const gap = scale * 2;
  const len = text.length;
  return len * glyphW + (len - 1) * gap;
}

// ---- compose one image per converter page ----------------------------------
const WHITE = [255, 255, 255];
const BG_SUBTLE = [246, 247, 249];
const BORDER = [226, 229, 235];
const PRIMARY = [47, 93, 245];
const PRIMARY_LIGHT = [140, 165, 250];
const PRIMARY_LIGHTER = [199, 211, 253];
const TEXT_DARK = [20, 23, 31];
const TEXT_MUTED = [86, 93, 109];

function composeImage(headline) {
  const buf = new Uint8Array(WIDTH * HEIGHT * 4);

  fillRect(buf, 0, 0, WIDTH, HEIGHT, WHITE);
  // subtle top accent bar (brand color)
  fillRect(buf, 0, 0, WIDTH, 10, PRIMARY);

  // card
  fillRect(buf, 60, 90, WIDTH - 120, HEIGHT - 180, BG_SUBTLE, 24);
  fillRect(buf, 60, 90, WIDTH - 120, 2, BORDER);

  // layered-squares graphic (right side) representing PSD layers
  const gx = 830, gy = 190;
  fillRect(buf, gx + 40, gy + 40, 220, 220, PRIMARY_LIGHTER, 16);
  fillRect(buf, gx + 20, gy + 20, 220, 220, PRIMARY_LIGHT, 16);
  fillRect(buf, gx, gy, 220, 220, PRIMARY, 16);
  fillRect(buf, gx + 30, gy + 30, 160, 14, WHITE);
  fillRect(buf, gx + 30, gy + 60, 100, 14, WHITE);

  // wordmark + tagline (left side)
  drawText(buf, 'LAYERPORTER', 130, 240, 10, TEXT_DARK);
  drawText(buf, headline, 130, 340, 6, PRIMARY);
  drawText(buf, 'FREE  IN YOUR BROWSER', 130, 400, 5, TEXT_MUTED);

  return buf;
}

// ---- encode PNG -------------------------------------------------------------
function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
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

function encodePng(rgba, width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk('IHDR', ihdrData);

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idatData = deflateSync(raw, { level: 9 });
  const idat = chunk('IDAT', idatData);

  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const { key, headline } of PAGES) {
  const buf = composeImage(headline);
  const png = encodePng(buf, WIDTH, HEIGHT);
  const outFile = path.join(OUT_DIR, `${key}.png`);
  writeFileSync(outFile, png);
  console.log(`OG image written: ${outFile} (${png.byteLength} bytes, ${WIDTH}x${HEIGHT})`);
}
