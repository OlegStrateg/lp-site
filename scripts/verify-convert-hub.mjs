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
  'Your file does not need a trip to somebody else’s server.',
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
  'https://schema.org',
  'CollectionPage',
  'ItemList',
  '<link rel="canonical" href="https://layerporter.com/convert/">',
];

for (const needle of required) {
  if (!html.includes(needle)) throw new Error(`Convert hub missing required marker: ${needle}`);
}

const oldThinMarkers = [
  '<h1>File converters</h1>',
  '<h2 id="converters-heading">Available converters</h2>',
];
for (const marker of oldThinMarkers) {
  if (html.includes(marker)) throw new Error(`Legacy thin hub marker still present: ${marker}`);
}

const converterLinks = (html.match(/href="\/convert\/(?:jpg-to-pdf|pdf-to-jpg|webp-to-jpg|favicon-generator|psd-to-png|psd-to-jpg|png-to-psd|jpg-to-psd|canva-to-google-slides)\/"/g) || []).length;
if (converterLinks !== 9) throw new Error(`Expected 9 primary tool links, got ${converterLinks}`);

const h1Count = (html.match(/<h1\b/g) || []).length;
if (h1Count !== 1) throw new Error(`Expected exactly one H1, got ${h1Count}`);

console.log('Convert hub PASS: SEO metadata, schema, 9 descriptive tool links, one H1');
