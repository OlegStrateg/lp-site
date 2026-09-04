import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'dist', 'convert', 'index.html');
if (!fs.existsSync(file)) throw new Error('Missing dist/convert/index.html');

const html = fs.readFileSync(file, 'utf8');

const required = [
  '<title>Free File Converter — JPG, PDF, WebP &amp; PSD | LayerPorter</title>',
  'Free File Converter',
  'Popular file converters',
  'PSD and image conversion tools',
  'Compatibility checker',
  'Picture Converter',
  'Add to Chrome',
  'Convert an image without leaving the page you found it on.',
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
  'href="/convert-hub-action.css"',
  '/images/picture-converter/images-to-pdf-example-640.webp',
  '/images/picture-converter/website-image-converter-640.webp',
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

for (const marker of ['<h1>File converters</h1>', '<h2 id="converters-heading">Available converters</h2>']) {
  if (html.includes(marker)) throw new Error(`Legacy thin hub marker still present: ${marker}`);
}

for (const route of [
  'jpg-to-pdf','pdf-to-jpg','webp-to-jpg','favicon-generator',
  'psd-to-png','psd-to-jpg','png-to-psd','jpg-to-psd','canva-to-google-slides',
]) {
  const count = (html.match(new RegExp(`href="/convert/${route}/"`, 'g')) || []).length;
  if (count < 1) throw new Error(`Missing clickable route: ${route}`);
}

const heroClickable = (html.match(/class="convert-visual-flow(?: hot)?" href="\/convert\//g) || []).length;
if (heroClickable !== 4) throw new Error(`Expected 4 clickable hero conversion flows, got ${heroClickable}`);

const localImages = (html.match(/\/images\/picture-converter\//g) || []).length;
if (localImages < 10) throw new Error(`Expected rich local image usage, got ${localImages} references`);
if (html.includes('images.unsplash.com')) throw new Error('Convert hub must not depend on Unsplash');

const h1Count = (html.match(/<h1\b/g) || []).length;
if (h1Count !== 1) throw new Error(`Expected exactly one H1, got ${h1Count}`);

console.log('Convert hub PASS: clickable visual flows, local images, Picture Converter CTA, SEO/schema, one H1');
