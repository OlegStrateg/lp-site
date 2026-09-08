import fs from 'node:fs';
import path from 'node:path';
import { PICTURE_CONVERTER_LOCALES } from './picture-converter-locales-data.mjs';

if (PICTURE_CONVERTER_LOCALES.length !== 49) {
  throw new Error(`Expected 49 canonical locale sources, got ${PICTURE_CONVERTER_LOCALES.length}`);
}

const normalizeCode = (code) => String(code).toLowerCase().replaceAll('_', '-');
const publishedCodes = new Set(['en', 'ru', 'de', 'es', 'fr', 'pt-br', 'ja', 'zh-cn']);
const publishedLocales = PICTURE_CONVERTER_LOCALES.filter((row) => publishedCodes.has(normalizeCode(row.code)));
const holdLocales = PICTURE_CONVERTER_LOCALES.filter((row) => !publishedCodes.has(normalizeCode(row.code)));

if (publishedLocales.length !== 8) {
  throw new Error(`Expected 8 published Convert Hub locales, got ${publishedLocales.length}`);
}
if (holdLocales.length !== 41) {
  throw new Error(`Expected 41 HOLD Convert Hub locales, got ${holdLocales.length}`);
}

const coreH1 = new Map([
  ['en', 'Free file converters.'],
  ['ru', 'Бесплатные конвертеры файлов.'],
  ['de', 'Kostenlose Dateikonverter.'],
  ['es', 'Convertidores de archivos gratis.'],
  ['fr', 'Convertisseurs de fichiers gratuits.'],
  ['pt-br', 'Conversores de arquivos grátis.'],
  ['ja', '無料ファイル変換ツール。'],
  ['zh-cn', '免费文件转换器。'],
]);

const canonicalPath = (row) => row.code === 'en' ? '/convert/' : `/${row.route}/convert/`;
const homePath = (row) => row.code === 'en' ? '/' : `/${row.route}/`;
const pictureConverterPath = (row) => row.code === 'en' ? '/picture-converter/' : `/${row.route}/picture-converter/`;
const hreflangs = [...publishedLocales.map((row) => row.hreflang), 'x-default'];
const routes = [
  'jpg-to-pdf','pdf-to-jpg','webp-to-jpg','favicon-generator',
  'psd-to-png','psd-to-jpg','png-to-psd','jpg-to-psd','canva-to-google-slides',
];

for (const locale of publishedLocales) {
  const routeDir = locale.code === 'en' ? [] : [locale.route];
  const file = path.join(process.cwd(), 'dist', ...routeDir, 'convert', 'index.html');
  if (!fs.existsSync(file)) throw new Error(`[${locale.code}] Missing published convert hub: ${file}`);
  const html = fs.readFileSync(file, 'utf8');
  const canonical = canonicalPath(locale);
  const visibleRoot = coreH1.get(normalizeCode(locale.code));
  const localHome = homePath(locale);
  const localPicture = pictureConverterPath(locale);

  const required = [
    visibleRoot,
    `lang="${locale.lang}"`,
    `<link rel="canonical" href="https://layerporter.com${canonical}">`,
    'href="/convert-hub.css"',
    'href="/convert-hub-i18n.css"',
    'Picture Converter',
    'oegpbmdpckfdgodnkdnoggedamfflfcl',
    `href="${localPicture}"`,
    `"url":"https://layerporter.com${localPicture}"`,
    `href="${localHome}#workflows"`,
    '/images/picture-converter/images-to-pdf-example-640.webp',
    '/images/picture-converter/webp-to-jpg-example-640.webp',
    '/images/picture-converter/picture-converter-chrome-960.webp',
    'https://schema.org',
    'CollectionPage',
    'ItemList',
    'primaryImageOfPage',
    `"inLanguage":"${locale.lang}"`,
    'https://layerporter.com/og/convert.png',
    '<meta property="og:image" content="https://layerporter.com/og/convert.png">',
  ];
  for (const needle of required) {
    if (!html.includes(needle)) throw new Error(`[${locale.code}] Missing required marker: ${needle}`);
  }

  if (html.includes(`href="${localHome}#learn"`)) {
    throw new Error(`[${locale.code}] Stale dead #learn navigation leaked into Convert Hub`);
  }

  const homeFile = path.join(process.cwd(), 'dist', ...routeDir, 'index.html');
  if (!fs.existsSync(homeFile)) throw new Error(`[${locale.code}] Missing Home for Convert Hub navigation check: ${homeFile}`);
  const homeHtml = fs.readFileSync(homeFile, 'utf8');
  if (!homeHtml.includes('id="workflows"')) {
    throw new Error(`[${locale.code}] Convert Hub Learn target #workflows is missing on Home`);
  }

  for (const hreflang of hreflangs) {
    if (!html.includes(`hreflang="${hreflang}"`)) throw new Error(`[${locale.code}] Missing hreflang: ${hreflang}`);
  }
  for (const hold of holdLocales) {
    if (html.includes(`hreflang="${hold.hreflang}"`)) {
      throw new Error(`[${locale.code}] HOLD locale leaked into hreflang: ${hold.hreflang}`);
    }
  }
  if (!html.includes('hreflang="x-default" href="https://layerporter.com/convert/"')) {
    throw new Error(`[${locale.code}] x-default does not point to English /convert/`);
  }

  for (const route of routes) {
    const count = (html.match(new RegExp(`href="/convert/${route}/"`, 'g')) || []).length;
    if (count < 1) throw new Error(`[${locale.code}] Missing clickable route: ${route}`);
  }

  const boardRoutes = (html.match(/class="hub-route" href="\/convert\//g) || []).length;
  if (boardRoutes !== 8) throw new Error(`[${locale.code}] Expected 8 hero routes, got ${boardRoutes}`);
  const toolCards = (html.match(/class="hub-tool-card" href="\/convert\//g) || []).length;
  if (toolCards !== 4) throw new Error(`[${locale.code}] Expected 4 popular cards, got ${toolCards}`);
  const designCards = (html.match(/class="hub-design-card" href="\/convert\//g) || []).length;
  if (designCards !== 4) throw new Error(`[${locale.code}] Expected 4 design cards, got ${designCards}`);
  const faqDetails = (html.match(/<details><summary><span>0[1-4]<\/span>/g) || []).length;
  if (faqDetails !== 4) throw new Error(`[${locale.code}] Expected 4 FAQ accordions, got ${faqDetails}`);
  const h1Count = (html.match(/<h1\b/g) || []).length;
  if (h1Count !== 1) throw new Error(`[${locale.code}] Expected exactly one H1, got ${h1Count}`);

  for (const marker of [
    '<h1>File converters</h1>',
    'Choose the exact job. The whole card is clickable',
    'No dead decorative tiles',
    'heic-to-jpg-example-640.webp',
    'images.unsplash.com',
  ]) {
    if (html.includes(marker)) throw new Error(`[${locale.code}] Contains forbidden/legacy marker: ${marker}`);
  }
}

for (const locale of holdLocales) {
  const file = path.join(process.cwd(), 'dist', locale.route, 'convert', 'index.html');
  if (fs.existsSync(file)) {
    throw new Error(`[${locale.code}] HOLD Convert Hub locale must not be built: ${file}`);
  }
}

const preferredImageFile = path.join(process.cwd(), 'dist', 'og', 'convert.png');
if (!fs.existsSync(preferredImageFile)) throw new Error('Missing dist/og/convert.png');
const preferredImage = fs.readFileSync(preferredImageFile);
if (preferredImage.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Preferred /convert/ image is not a valid PNG');
const preferredWidth = preferredImage.readUInt32BE(16);
const preferredHeight = preferredImage.readUInt32BE(20);
if (preferredWidth !== 1200 || preferredHeight !== 630) throw new Error(`Expected /og/convert.png 1200x630, got ${preferredWidth}x${preferredHeight}`);
if (preferredImage.byteLength > 250_000) throw new Error(`Preferred /convert/ image is unexpectedly heavy: ${preferredImage.byteLength} bytes`);

const sitemapFile = path.join(process.cwd(), 'dist', 'sitemap.xml');
if (!fs.existsSync(sitemapFile)) throw new Error('Missing dist/sitemap.xml');
const sitemap = fs.readFileSync(sitemapFile, 'utf8');
for (const locale of publishedLocales) {
  const canonical = canonicalPath(locale);
  if (!sitemap.includes(`<loc>https://layerporter.com${canonical}</loc>`)) {
    throw new Error(`[${locale.code}] Missing published convert hub in sitemap`);
  }
}
for (const locale of holdLocales) {
  const canonical = canonicalPath(locale);
  if (sitemap.includes(`<loc>https://layerporter.com${canonical}</loc>`)) {
    throw new Error(`[${locale.code}] HOLD Convert Hub locale leaked into sitemap`);
  }
}

console.log(`Convert hub i18n PASS: 8 published locales + locale-aware navigation + 41 HOLD locales excluded + reciprocal hreflang + sitemap + SEO image (${preferredImage.byteLength} bytes)`);
