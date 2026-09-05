import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'dist', 'convert', 'index.html');
if (!fs.existsSync(file)) throw new Error('Missing dist/convert/index.html');

const html = fs.readFileSync(file, 'utf8');

const required = [
  '<title>Free File Converter — JPG, PDF, WebP &amp; PSD | LayerPorter</title>',
  'Free file converters.',
  'Choose the exact route.',
  'Popular converters',
  'Four PSD routes.',
  'Canva → Google Slides',
  'Picture Converter',
  'Add to Chrome',
  'Need more image formats or conversion directly from a website?',
  'oegpbmdpckfdgodnkdnoggedamfflfcl',
  'href="/picture-converter/"',
  'href="/convert/jpg-to-pdf/"',
  'href="/convert/pdf-to-jpg/"',
  'href="/convert/webp-to-jpg/"',
  'href="/convert/favicon-generator/"',
  'href="/convert/psd-to-png/"',
  'href="/convert/psd-to-jpg/"',
  'href="/convert/png-to-psd/"',
  'href="/convert/jpg-to-psd/"',
  'href="/convert/canva-to-google-slides/"',
  'href="/convert-hub.css"',
  '/images/picture-converter/images-to-pdf-example-640.webp',
  '/images/picture-converter/webp-to-jpg-example-640.webp',
  '/images/picture-converter/picture-converter-chrome-960.webp',
  '/picture-converter/welcome/picture-converter-icon.png',
  'https://schema.org',
  'CollectionPage',
  'ItemList',
  '<link rel="canonical" href="https://layerporter.com/convert/">',
];

for (const needle of required) {
  if (!html.includes(needle)) throw new Error(`Convert hub missing required marker: ${needle}`);
}

for (const marker of [
  '<h1>File converters</h1>',
  '<h2 id="converters-heading">Available converters</h2>',
  'Choose the exact job. The whole card is clickable',
  'No dead decorative tiles',
  'heic-to-jpg-example-640.webp',
  'images.unsplash.com',
]) {
  if (html.includes(marker)) throw new Error(`Convert hub contains forbidden/legacy marker: ${marker}`);
}

const routes = [
  'jpg-to-pdf','pdf-to-jpg','webp-to-jpg','favicon-generator',
  'psd-to-png','psd-to-jpg','png-to-psd','jpg-to-psd','canva-to-google-slides',
];
for (const route of routes) {
  const count = (html.match(new RegExp(`href="/convert/${route}/"`, 'g')) || []).length;
  if (count < 1) throw new Error(`Missing clickable route: ${route}`);
}

const boardRoutes = (html.match(/class="hub-route" href="\/convert\//g) || []).length;
if (boardRoutes !== 8) throw new Error(`Expected 8 converter routes in hero board, got ${boardRoutes}`);

const toolCards = (html.match(/class="hub-tool-card" href="\/convert\//g) || []).length;
if (toolCards !== 4) throw new Error(`Expected 4 popular converter cards, got ${toolCards}`);

const designCards = (html.match(/class="hub-design-card" href="\/convert\//g) || []).length;
if (designCards !== 4) throw new Error(`Expected 4 design converter cards, got ${designCards}`);

const localImages = (html.match(/\/images\/picture-converter\//g) || []).length;
if (localImages < 8) throw new Error(`Expected responsive local product imagery, got ${localImages} references`);

const h1Count = (html.match(/<h1\b/g) || []).length;
if (h1Count !== 1) throw new Error(`Expected exactly one H1, got ${h1Count}`);

const detailsCount = (html.match(/<details>/g) || []).length;
if (detailsCount !== 4) throw new Error(`Expected 4 useful-information accordions, got ${detailsCount}`);

console.log('Convert hub PASS: complete catalog, 8 hero routes, 4 popular tools, 4 design tools, checker, extension, schema and one H1');
