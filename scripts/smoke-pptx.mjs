// PPTX checker smoke gate: builds a minimal-but-valid PPTX programmatically
// (fflate zipSync) and runs it through the REAL product parsing module
// (src/lib/pptx/checkPptx.ts — the same module pptxCheck.worker.ts imports).
// Asserts slide count, slide size (EMU->inches), font detection + safe-list
// flagging, media count, and gradient/grouped-shape counts. Also asserts the
// two error paths (not_pptx, invalid_zip). Runs before every `npm run build`.
import { zipSync, strToU8 } from 'fflate';
import { checkPptx } from '../src/lib/pptx/checkPptx.ts';

// Slide 1: safe font + custom font, one gradient fill, one grouped shape.
const slide1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:grpSp><p:nvGrpSpPr/><p:grpSpPr/></p:grpSp>
    <p:sp><p:txBody><a:p><a:r>
      <a:rPr lang="en-US"><a:latin typeface="Arial"/></a:rPr>
      <a:t>Hello</a:t>
    </a:r></a:p></p:txBody></p:sp>
    <p:sp><p:spPr><a:gradFill><a:gsLst/></a:gradFill></p:spPr><p:txBody><a:p><a:r>
      <a:rPr lang="en-US"><a:latin typeface="Fancy Custom Font"/></a:rPr>
      <a:t>World</a:t>
    </a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:sld>`;

// Slide 2: plain, no overrides.
const slide2 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree/></p:cSld>
</p:sld>`;

// Theme: declares Montserrat (safe) + a "+mj-lt" style placeholder that must be
// skipped, and a gradFill inside the format scheme that must NOT count.
const theme = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <a:themeElements><a:fontScheme name="Office">
    <a:majorFont><a:latin typeface="Montserrat"/></a:majorFont>
    <a:minorFont><a:latin typeface="+mn-lt"/></a:minorFont>
  </a:fontScheme>
  <a:fmtScheme><a:fillStyleLst><a:gradFill><a:gsLst/></a:gradFill></a:fillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`;

// 16:9 deck: 12192000 x 6858000 EMU = 13.3 x 7.5 in.
const presentation = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldSz cx="12192000" cy="6858000"/>
</p:presentation>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`;

const pptx = zipSync({
  '[Content_Types].xml': strToU8(contentTypes),
  'ppt/presentation.xml': strToU8(presentation),
  'ppt/slides/slide1.xml': strToU8(slide1),
  'ppt/slides/slide2.xml': strToU8(slide2),
  'ppt/theme/theme1.xml': strToU8(theme),
  'ppt/media/image1.png': new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
});
console.log('built pptx bytes:', pptx.byteLength);

const r = checkPptx(pptx);
console.log('report:', JSON.stringify(r));

// Error path 1: valid zip, not a pptx.
let notPptxOk = false;
try {
  checkPptx(zipSync({ 'readme.txt': strToU8('hi') }));
} catch (e) {
  notPptxOk = e.message === 'not_pptx';
}

// Error path 2: not a zip at all.
let invalidZipOk = false;
try {
  checkPptx(new Uint8Array([1, 2, 3, 4, 5]));
} catch (e) {
  invalidZipOk = e.message === 'invalid_zip';
}
console.log('error paths: not_pptx =', notPptxOk, '| invalid_zip =', invalidZipOk);

const ok =
  r.slideCount === 2 &&
  r.widthIn === 13.3 && r.heightIn === 7.5 &&
  r.fonts.length === 3 &&
  r.fonts.includes('Arial') && r.fonts.includes('Fancy Custom Font') && r.fonts.includes('Montserrat') &&
  r.flaggedFonts.length === 1 && r.flaggedFonts[0] === 'Fancy Custom Font' &&
  r.mediaCount === 1 &&
  r.gradientCount === 1 && // slide gradFill counts, theme fmtScheme gradFill must not
  r.groupedShapeCount === 1 &&
  notPptxOk && invalidZipOk;

console.log(ok ? 'PPTX SMOKE PASS' : 'PPTX SMOKE FAIL');
process.exit(ok ? 0 : 1);
