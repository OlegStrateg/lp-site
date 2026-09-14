import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pageFile = path.join(root, 'dist', 'audio-extractor', 'index.html');
const sitemapFile = path.join(root, 'dist', 'sitemap.xml');

function must(condition, message) {
  if (!condition) throw new Error(message);
}

must(fs.existsSync(pageFile), 'Audio Extractor landing was not built');
must(fs.existsSync(sitemapFile), 'sitemap.xml was not built');

const html = fs.readFileSync(pageFile, 'utf8');
const sitemap = fs.readFileSync(sitemapFile, 'utf8');
const storeId = 'hombbkmdpbfjokmbobhpakdldmchbcnn';

must(html.includes('<title>Audio Extractor from Video Extension — MP3, WAV &amp; M4A | LayerPorter</title>') || html.includes('<title>Audio Extractor from Video Extension — MP3, WAV & M4A | LayerPorter</title>'), 'Expected Audio Extractor title missing');
must(html.includes('rel="canonical" href="https://layerporter.com/audio-extractor/"'), 'Audio Extractor canonical missing');
must(html.includes('Extract audio <span class="accent">without the download-and-reopen detour.</span>'), 'Audio Extractor CRO H1 missing');
must(html.includes(storeId), 'Chrome Web Store ID missing');

for (const placement of ['header', 'hero', 'compare', 'final', 'mobile_sticky']) {
  must(html.includes(`utm_content=${placement}`), `Missing UTM placement: ${placement}`);
}

must(html.includes('utm_source=layerporter'), 'UTM source missing');
must(html.includes('utm_medium=website'), 'UTM medium missing');
must(html.includes('utm_campaign=audio_extractor'), 'UTM campaign missing');
must(!html.includes('authuser='), 'Public Chrome Web Store links must not contain authuser');

for (const schemaType of ['SoftwareApplication', 'FAQPage', 'WebPage', 'Organization']) {
  must(html.includes(`"@type":"${schemaType}"`) || html.includes(`&quot;@type&quot;:&quot;${schemaType}&quot;`), `Schema type missing: ${schemaType}`);
}

must(html.includes('/tools/extract-audio-from-video/'), 'Internal link to web audio tool missing');
must(html.includes('lp-product-analytics:v1'), 'Shared product analytics was not injected');
must(sitemap.includes('<loc>https://layerporter.com/audio-extractor/</loc>'), 'Audio Extractor missing from sitemap');

for (const claim of ['supported current-page media', 'choose start and end', 'MP3 · WAV · M4A', 'one-off local MP3 extraction']) {
  must(html.toLowerCase().includes(claim.toLowerCase()), `Expected positioning claim missing: ${claim}`);
}

for (const image of ['travel-reference-960.webp', 'fashion-board-reference-640.webp', 'creative-workflow-reference-640.webp']) {
  must(html.includes(image), `Optimized product image missing: ${image}`);
}

must(html.includes('fetchpriority="high"'), 'Hero image priority hint missing');
must(html.includes('loading="lazy"'), 'Below-fold lazy image loading missing');
must(html.includes('srcset='), 'Responsive image srcset missing');

console.log('Audio Extractor landing PASS: CRO + SEO + UTM + schema + analytics + responsive images + sitemap');
