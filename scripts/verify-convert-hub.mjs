import fs from 'node:fs';
import path from 'node:path';
import { PICTURE_CONVERTER_LOCALES } from './picture-converter-locales-data.mjs';

if (PICTURE_CONVERTER_LOCALES.length !== 49) {
  throw new Error(`Expected 49 canonical locale sources, got ${PICTURE_CONVERTER_LOCALES.length}`);
}

const normalizeCode = (code) => String(code).toLowerCase().replaceAll('_', '-');
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');
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

// LP-070 deliberately freezes SEO-sensitive title/meta/H1 while improving only
// the user-facing explanatory copy below the hero.
const coreSeo = new Map([
  ['en', {
    title: 'Free File Converter — JPG, PDF, WebP & PSD | LayerPorter',
    description: 'Free file converters for JPG, PNG, PDF, WebP and PSD. Convert files in your browser with no uploads, no account and no server processing.',
  }],
  ['ru', {
    title: 'Бесплатный конвертер файлов — JPG, PDF, WebP и PSD | LayerPorter',
    description: 'Бесплатный конвертер файлов JPG, PNG, PDF, WebP и PSD. Конвертируйте файлы в браузере без загрузки на сервер и без регистрации.',
  }],
  ['de', {
    title: 'Kostenloser Dateikonverter — JPG, PDF, WebP & PSD | LayerPorter',
    description: 'Kostenloser Dateikonverter für JPG, PNG, PDF, WebP und PSD. Dateien direkt im Browser konvertieren — ohne Upload, Konto oder Serververarbeitung.',
  }],
  ['es', {
    title: 'Convertidor de archivos gratis — JPG, PDF, WebP y PSD | LayerPorter',
    description: 'Convertidor de archivos gratis para JPG, PNG, PDF, WebP y PSD. Convierte archivos en el navegador sin subirlos, sin cuenta y sin procesamiento en servidor.',
  }],
  ['fr', {
    title: 'Convertisseur de fichiers gratuit — JPG, PDF, WebP et PSD | LayerPorter',
    description: 'Convertisseur de fichiers gratuit pour JPG, PNG, PDF, WebP et PSD. Convertissez dans le navigateur sans téléversement, sans compte et sans traitement serveur.',
  }],
  ['pt-br', {
    title: 'Conversor de arquivos grátis — JPG, PDF, WebP e PSD | LayerPorter',
    description: 'Conversor de arquivos grátis para JPG, PNG, PDF, WebP e PSD. Converta arquivos no navegador sem upload, sem conta e sem processamento no servidor.',
  }],
  ['ja', {
    title: '無料ファイル変換 — JPG・PDF・WebP・PSD | LayerPorter',
    description: 'JPG、PNG、PDF、WebP、PSDに対応した無料ファイル変換ツール。アップロードやアカウント登録なしで、ブラウザ上でファイルを変換できます。',
  }],
  ['zh-cn', {
    title: '免费文件转换器 — JPG、PDF、WebP 和 PSD | LayerPorter',
    description: '免费文件转换器，支持 JPG、PNG、PDF、WebP 和 PSD。无需上传文件、无需注册账号，直接在浏览器中完成转换。',
  }],
]);

const coreCopy = new Map([
  ['en', {
    popular: 'Choose the conversion that matches the file you have and the result you need.',
    design: 'Convert PSD files to PNG or JPG, or move PNG and JPG into a PSD document.',
  }],
  ['ru', {
    popular: 'Выберите конвертацию под исходный файл и нужный результат.',
    design: 'Конвертируйте PSD в PNG или JPG либо переносите PNG и JPG в PSD-документ.',
  }],
  ['de', {
    popular: 'Wähle die Konvertierung passend zu deiner Ausgangsdatei und dem gewünschten Ergebnis.',
    design: 'PSD in PNG oder JPG umwandeln oder PNG und JPG in ein PSD-Dokument übernehmen.',
  }],
  ['es', {
    popular: 'Elige la conversión según el archivo que tienes y el resultado que necesitas.',
    design: 'Convierte PSD a PNG o JPG, o pasa PNG y JPG a un documento PSD.',
  }],
  ['fr', {
    popular: 'Choisissez la conversion adaptée à votre fichier de départ et au résultat recherché.',
    design: 'Convertissez un PSD en PNG ou JPG, ou placez un PNG ou un JPG dans un document PSD.',
  }],
  ['pt-br', {
    popular: 'Escolha a conversão de acordo com o arquivo que você tem e o resultado que precisa.',
    design: 'Converta PSD para PNG ou JPG, ou leve PNG e JPG para um documento PSD.',
  }],
  ['ja', {
    popular: '元のファイルと必要な結果に合う変換を選べます。',
    design: 'PSDをPNGやJPGに変換し、PNGやJPGをPSDドキュメントに移せます。',
  }],
  ['zh-cn', {
    popular: '根据现有文件和需要的结果，直接选择对应的转换。',
    design: '将 PSD 转为 PNG 或 JPG，也可以把 PNG 和 JPG 放入 PSD 文档。',
  }],
]);

const forbiddenDesignRationale = [
  'Real product imagery where it explains the task.',
  'Four PSD routes. One consistent visual system.',
  'Реальные изображения продукта там, где они помогают понять задачу.',
  'Четыре направления PSD. Единая визуальная система.',
  'Echte Produktbilder, wenn sie die Aufgabe erklären.',
  'Vier PSD-Wege. Ein einheitliches visuelles System.',
  'Imágenes reales del producto cuando ayudan a entender la tarea.',
  'Cuatro rutas PSD. Un sistema visual coherente.',
  'Des visuels produit réels lorsqu’ils expliquent la tâche.',
  'Quatre parcours PSD. Un seul système visuel.',
  'Imagens reais do produto quando ajudam a explicar a tarefa.',
  'Quatro rotas PSD. Um sistema visual consistente.',
  '作業内容の理解に役立つ場所では実際の製品画像を使い',
  '4つのPSDルートを、統一した見た目で。',
  '能帮助理解任务时使用真实产品图片',
  '四种 PSD 转换路径，一套一致的视觉系统。',
];

const canonicalPath = (row) => row.code === 'en' ? '/convert/' : `/${row.route}/convert/`;
const homePath = (row) => row.code === 'en' ? '/' : `/${row.route}/`;
const pictureConverterPath = (row) => row.code === 'en' ? '/picture-converter/' : `/${row.route}/picture-converter/`;
const hreflangs = [...publishedLocales.map((row) => row.hreflang), 'x-default'];
const routes = [
  'jpg-to-pdf','pdf-to-jpg','webp-to-jpg','favicon-generator',
  'psd-to-png','psd-to-jpg','png-to-psd','jpg-to-psd','canva-to-google-slides',
];
const localizedExactRoutes = new Map([
  ['ru', new Set(['jpg-to-pdf'])],
  ['pt-br', new Set(['jpg-to-pdf', 'pdf-to-jpg', 'webp-to-jpg', 'favicon-generator', 'png-to-psd', 'jpg-to-psd', 'psd-to-jpg', 'psd-to-png', 'canva-to-google-slides'])],
]);
const expectedRoutePath = (locale, route) =>
  localizedExactRoutes.get(normalizeCode(locale.code))?.has(route)
    ? `/${locale.route}/convert/${route}/`
    : `/convert/${route}/`;

for (const locale of publishedLocales) {
  const code = normalizeCode(locale.code);
  const routeDir = locale.code === 'en' ? [] : [locale.route];
  const file = path.join(process.cwd(), 'dist', ...routeDir, 'convert', 'index.html');
  if (!fs.existsSync(file)) throw new Error(`[${locale.code}] Missing published convert hub: ${file}`);
  const html = fs.readFileSync(file, 'utf8');
  const canonical = canonicalPath(locale);
  const visibleRoot = coreH1.get(code);
  const seo = coreSeo.get(code);
  const copy = coreCopy.get(code);
  const localHome = homePath(locale);
  const localPicture = pictureConverterPath(locale);
  if (!seo || !copy) throw new Error(`[${locale.code}] Missing LP-070 core SEO/copy baseline`);

  const required = [
    visibleRoot,
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}">`,
    copy.popular,
    copy.design,
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

  for (const stale of forbiddenDesignRationale) {
    if (html.includes(stale)) throw new Error(`[${locale.code}] Internal design rationale leaked into user copy: ${stale}`);
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
    const expected = expectedRoutePath(locale, route);
    const count = (html.match(new RegExp(`href="${expected.replaceAll('/', '\\/')}"`, 'g')) || []).length;
    if (count < 1) throw new Error(`[${locale.code}] Missing clickable route: ${expected}`);
    if (!html.includes(`"url":"https://layerporter.com${expected}"`)) {
      throw new Error(`[${locale.code}] Schema route does not match clickable route: ${expected}`);
    }
  }

  const boardRoutes = (html.match(/class="hub-route" href=/g) || []).length;
  if (boardRoutes !== 8) throw new Error(`[${locale.code}] Expected 8 hero routes, got ${boardRoutes}`);
  const toolCards = (html.match(/class="hub-tool-card" href=/g) || []).length;
  if (toolCards !== 4) throw new Error(`[${locale.code}] Expected 4 popular cards, got ${toolCards}`);
  const designCards = (html.match(/class="hub-design-card" href=/g) || []).length;
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
for (const localizedPath of ['/ru/convert/jpg-to-pdf/', '/pt-br/convert/jpg-to-pdf/', '/pt-br/convert/pdf-to-jpg/', '/pt-br/convert/webp-to-jpg/', '/pt-br/convert/favicon-generator/', '/pt-br/convert/png-to-psd/', '/pt-br/convert/jpg-to-psd/', '/pt-br/convert/psd-to-jpg/', '/pt-br/convert/psd-to-png/', '/pt-br/convert/canva-to-google-slides/']) {
  if (!sitemap.includes(`<loc>https://layerporter.com${localizedPath}</loc>`)) {
    throw new Error(`Missing localized exact-converter in sitemap: ${localizedPath}`);
  }
  const localizedFile = path.join(process.cwd(), 'dist', ...localizedPath.split('/').filter(Boolean), 'index.html');
  if (!fs.existsSync(localizedFile)) {
    throw new Error(`Missing localized exact-converter build output: ${localizedFile}`);
  }
}

console.log(`Convert hub i18n PASS: 8 published locales + LP-070 copy gate + frozen SEO title/meta/H1 + locale-aware navigation + localized exact-converter routing + 41 HOLD locales excluded + reciprocal hreflang + sitemap + SEO image (${preferredImage.byteLength} bytes)`);