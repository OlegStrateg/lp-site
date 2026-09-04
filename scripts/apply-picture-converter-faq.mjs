import fs from 'node:fs';
import path from 'node:path';
import { PICTURE_CONVERTER_LOCALES } from './picture-converter-locales-data.mjs';
import {
  PICTURE_CONVERTER_FAQ_QUESTIONS,
  PICTURE_CONVERTER_FAQ_EN_ANSWERS,
} from './picture-converter-faq-data.mjs';

const root = process.cwd();
const dist = path.join(root, 'dist');

const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

function pagePath(row) {
  return row.code === 'en'
    ? path.join(dist, 'picture-converter', 'index.html')
    : path.join(dist, row.route, 'picture-converter', 'index.html');
}

function answersFor(row) {
  if (row.code === 'en') return PICTURE_CONVERTER_FAQ_EN_ANSWERS;
  const [webCopy, localCopy, pdfCopy, privacy] = row.copy;
  return [
    `${localCopy} ${privacy}`,
    `${localCopy} ${privacy}`,
    `${pdfCopy} ${privacy}`,
    `${localCopy} ${privacy}`,
    `${localCopy} ${privacy}`,
    `${webCopy} ${localCopy}`,
    `${localCopy} ${privacy}`,
  ];
}

function renderFaq(row) {
  const questions = PICTURE_CONVERTER_FAQ_QUESTIONS[row.code];
  if (!questions || questions.length !== 7) {
    throw new Error(`FAQ questions missing/invalid for ${row.code}`);
  }
  const answers = answersFor(row);
  if (answers.length !== 7) throw new Error(`FAQ answers missing/invalid for ${row.code}`);

  const items = questions.map((q, i) => `
        <details${i === 0 ? ' open' : ''}>
          <summary><span>${String(i + 1).padStart(2,'0')}</span><b>${esc(q)}</b><i>+</i></summary>
          <p>${esc(answers[i])}</p>
        </details>`).join('');

  return `<section class="wrap faq" id="faq">
    <div class="faq-grid">
      <div>
        <div class="section-number">05</div>
        <h2>${esc(row.root)}</h2>
      </div>
      <div>${items}
      </div>
    </div>
  </section>`;
}

let processed = 0;
for (const row of PICTURE_CONVERTER_LOCALES) {
  const file = pagePath(row);
  if (!fs.existsSync(file)) throw new Error(`Missing generated locale page: ${file}`);

  let html = fs.readFileSync(file, 'utf8');
  const next = html.replace(
    /<section class="wrap faq" id="faq">[\s\S]*?<\/section>/,
    renderFaq(row)
  );
  if (next === html) throw new Error(`FAQ block not replaced for ${row.code}`);
  html = next;

  const questions = PICTURE_CONVERTER_FAQ_QUESTIONS[row.code];
  for (const q of questions) {
    if (!html.includes(esc(q))) throw new Error(`FAQ question missing in ${row.code}: ${q}`);
  }

  const faqMatch = html.match(/<section class="wrap faq" id="faq">[\s\S]*?<\/section>/);
  if (!faqMatch) throw new Error(`Rendered FAQ block missing in ${row.code}`);
  const faqHtml = faqMatch[0];
  if (faqHtml.includes('<b>WebP → JPG / PNG</b>') ||
      faqHtml.includes('<b>HEIC → JPG</b>') ||
      faqHtml.includes('<b>PDF · 30</b>') ||
      faqHtml.includes('<b>LOCAL</b>')) {
    throw new Error(`Legacy technical FAQ label remains inside FAQ in ${row.code}`);
  }

  const faqDetailCount = (faqHtml.match(/<details/g) || []).length;
  if (faqDetailCount !== 7) {
    throw new Error(`Expected exactly 7 FAQ items in ${row.code}, got ${faqDetailCount}`);
  }

  fs.writeFileSync(file, html);
  processed += 1;
}

const enFile = pagePath(PICTURE_CONVERTER_LOCALES.find(x => x.code === 'en'));
const en = fs.readFileSync(enFile, 'utf8');

const requiredEnglish = [
  'How do I convert HEIC to JPG?',
  'How do I open a HEIC file?',
  'How do I convert a PNG or photo to PDF?',
  'How do I convert PNG to JPG or JPG to PNG?',
  'How do I convert an image or photo to JPG?',
  'How do I convert WebP to JPG or PNG?',
  'How do I convert AVIF to JPG?',
];
for (const q of requiredEnglish) {
  if (!en.includes(q)) throw new Error(`English FAQ missing: ${q}`);
}
if (!en.includes('up to 30 images')) throw new Error('English PDF answer lost 30-image Product Truth');
if (!en.includes('does not create transparency')) throw new Error('English PNG answer lost transparency caveat');
if (!en.includes('not uploaded for conversion')) throw new Error('English HEIC answer lost local-processing trust claim');

console.log(`Picture Converter FAQ PASS: ${processed}/49 locales; 7 natural questions each`);
