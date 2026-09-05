import fs from 'node:fs';
import path from 'node:path';

const locales = [
  { code: 'en', lang: 'en', route: '', h1: 'Free file converters.', canonical: '/convert/' },
  { code: 'ru', lang: 'ru', route: 'ru', h1: 'Бесплатные конвертеры файлов.', canonical: '/ru/convert/' },
  { code: 'de', lang: 'de', route: 'de', h1: 'Kostenlose Dateikonverter.', canonical: '/de/convert/' },
  { code: 'es', lang: 'es', route: 'es', h1: 'Convertidores de archivos gratis.', canonical: '/es/convert/' },
  { code: 'fr', lang: 'fr', route: 'fr', h1: 'Convertisseurs de fichiers gratuits.', canonical: '/fr/convert/' },
  { code: 'pt-br', lang: 'pt-BR', route: 'pt-br', h1: 'Conversores de arquivos grátis.', canonical: '/pt-br/convert/' },
  { code: 'ja', lang: 'ja', route: 'ja', h1: '無料ファイル変換ツール。', canonical: '/ja/convert/' },
  { code: 'zh-cn', lang: 'zh-CN', route: 'zh-cn', h1: '免费文件转换器。', canonical: '/zh-cn/convert/' },
];

const hreflangs = ['en', 'ru', 'de', 'es', 'fr', 'pt-BR', 'ja', 'zh-CN', 'x-default'];
const routes = [
  'jpg-to-pdf','pdf-to-jpg','webp-to-jpg','favicon-generator',
  'psd-to-png','psd-to-jpg','png-to-psd','jpg-to-psd','canva-to-google-slides',
];

for (const locale of locales) {
  const dir = locale.route ? path.join(process.cwd(), 'dist', locale.route, 'convert') : path.join(process.cwd(), 'dist', 'convert');
  const file = path.join(dir, 'index.html');
  if (!fs.existsSync(file)) throw new Error(`Missing localized convert hub: ${file}`);
  const html = fs.readFileSync(file, 'utf8');

  const required = [
    locale.h1,
    `lang="${locale.lang}"`,
    `href="https://layerporter.com${locale.canonical}"`,
    'href="/convert-hub.css"',
    'href="/convert-hub-i18n.css"',
    'Picture Converter',
    'oegpbmdpckfdgodnkdnoggedamfflfcl',
    'href="/picture-converter/"',
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

  for (const hreflang of hreflangs) {
    if (!html.includes(`hreflang="${hreflang}"`)) throw new Error(`[${locale.code}] Missing hreflang: ${hreflang}`);
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

  if (locale.code !== 'en' && html.includes('<span>Free file converters.</span>')) {
    throw new Error(`[${locale.code}] English H1 placeholder leaked into localized page`);
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
for (const locale of locales) {
  if (!sitemap.includes(`<loc>https://layerporter.com${locale.canonical}</loc>`)) {
    throw new Error(`[${locale.code}] Missing localized convert hub in sitemap`);
  }
}

console.log(`Convert hub i18n PASS: ${locales.length} locales + reciprocal hreflang + sitemap + SEO image (${preferredImage.byteLength} bytes)`);
