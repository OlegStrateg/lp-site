// PPTX compatibility check — pure parsing module, no DOM/canvas dependencies.
// Imported by BOTH the production worker (pptxCheck.worker.ts) and the node
// smoke gate (scripts/smoke-pptx.mjs), so the smoke test exercises the real
// product code path (same pattern as buildPsd.ts / readPsdComposite.ts).
//
// What it does: unzips a .pptx (it's a ZIP of XML parts) with fflate, then
// string-scans the XML — no XML parser needed for these checks:
// - slide count:        ppt/slides/slideN.xml entries
// - slide size:         <p:sldSz cx=".." cy=".."> in ppt/presentation.xml (EMU, 914400/inch)
// - fonts:              typeface="..." in ppt/theme/*.xml + ppt/slides/*.xml
//                       (theme refs like "+mj-lt" are skipped), compared against
//                       a hardcoded list of fonts Google Slides has natively
// - media files:        ppt/media/* entries
// - risky objects:      <a:gradFill> (gradient fills) and <p:grpSp> (grouped
//                       shapes) occurrences across slide XML — both routinely
//                       get simplified by the Slides importer
import { unzipSync } from 'fflate';

// Fonts Google Slides renders without substitution: the MS core set it ships
// plus popular Google Fonts (Canva's most-used overlap). Lowercased family names.
const SLIDES_SAFE_FONTS = new Set([
  // MS core fonts available in Google Slides
  'arial', 'times new roman', 'courier new', 'georgia', 'verdana', 'tahoma',
  'trebuchet ms', 'impact', 'comic sans ms',
  // Popular Google Fonts
  'roboto', 'roboto condensed', 'roboto slab', 'roboto mono', 'open sans',
  'lato', 'montserrat', 'oswald', 'merriweather', 'raleway', 'poppins',
  'nunito', 'nunito sans', 'playfair display', 'source sans pro', 'pt sans',
  'pt serif', 'ubuntu', 'noto sans', 'noto serif', 'work sans', 'inter',
  'quicksand', 'josefin sans', 'bebas neue', 'anton', 'abril fatface',
  'lobster', 'pacifico', 'dancing script', 'caveat', 'shadows into light',
  'amatic sc', 'archivo', 'barlow', 'dm sans', 'karla', 'rubik', 'cabin',
  'fira sans', 'inconsolata', 'crimson text', 'libre baskerville', 'arvo',
  'bitter', 'lora', 'mulish', 'manrope', 'space grotesk', 'cormorant garamond',
]);

const EMU_PER_INCH = 914400;

export interface PptxReport {
  slideCount: number;
  /** Slide size in inches (one decimal), null when presentation.xml has no sldSz. */
  widthIn: number | null;
  heightIn: number | null;
  /** Unique font families found (original casing), sorted. */
  fonts: string[];
  /** Subset of `fonts` NOT in the Google Slides safe list — likely substituted. */
  flaggedFonts: string[];
  mediaCount: number;
  gradientCount: number;
  groupedShapeCount: number;
}

const decoder = new TextDecoder();

export function checkPptx(bytes: Uint8Array): PptxReport {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new Error('invalid_zip');
  }

  // A real PPTX always carries these two markers.
  if (!entries['[Content_Types].xml'] || !entries['ppt/presentation.xml']) {
    throw new Error('not_pptx');
  }

  const names = Object.keys(entries);
  const slideNames = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const themeNames = names.filter((n) => /^ppt\/theme\/[^/]+\.xml$/.test(n));
  const mediaCount = names.filter((n) => n.startsWith('ppt/media/')).length;

  // Slide size (EMU -> inches, one decimal)
  const presentationXml = decoder.decode(entries['ppt/presentation.xml']);
  const sldSz = presentationXml.match(/<p:sldSz[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
  const widthIn = sldSz ? Math.round((Number(sldSz[1]) / EMU_PER_INCH) * 10) / 10 : null;
  const heightIn = sldSz ? Math.round((Number(sldSz[2]) / EMU_PER_INCH) * 10) / 10 : null;

  // Fonts: typeface="..." in theme + slide XML. Skip theme placeholders (+mj-lt
  // and friends) — they are references, not font families.
  const fontSet = new Map<string, string>(); // lowercased -> original casing
  let gradientCount = 0;
  let groupedShapeCount = 0;

  for (const name of [...themeNames, ...slideNames]) {
    const xml = decoder.decode(entries[name]);
    for (const m of xml.matchAll(/typeface="([^"]+)"/g)) {
      const family = m[1].trim();
      if (!family || family.startsWith('+')) continue;
      const key = family.toLowerCase();
      if (!fontSet.has(key)) fontSet.set(key, family);
    }
    // Risky objects are only counted on slides — theme XML declares format
    // schemes (fillStyleLst) that contain gradFill without any slide using one.
    if (name.startsWith('ppt/slides/')) {
      gradientCount += (xml.match(/<a:gradFill\b/g) ?? []).length;
      groupedShapeCount += (xml.match(/<p:grpSp>/g) ?? []).length;
    }
  }

  const fonts = [...fontSet.values()].sort((a, b) => a.localeCompare(b));
  const flaggedFonts = fonts.filter((f) => !SLIDES_SAFE_FONTS.has(f.toLowerCase()));

  return {
    slideCount: slideNames.length,
    widthIn,
    heightIn,
    fonts,
    flaggedFonts,
    mediaCount,
    gradientCount,
    groupedShapeCount,
  };
}
