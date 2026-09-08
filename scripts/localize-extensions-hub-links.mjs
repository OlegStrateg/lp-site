import fs from 'node:fs';
import path from 'node:path';

const locales = ['ru', 'de', 'es', 'fr', 'pt-br', 'ja', 'zh-cn'];
const rootConvertLink = 'href="/convert/"';
const rootPictureUrl = 'https://layerporter.com/picture-converter/';

const dist = path.join(process.cwd(), 'dist');
const englishHub = path.join(dist, 'extensions', 'index.html');
if (!fs.existsSync(englishHub)) throw new Error('Missing EN Extensions Hub: dist/extensions/index.html');

const englishHtml = fs.readFileSync(englishHub, 'utf8');
if (!englishHtml.includes(rootPictureUrl)) {
  throw new Error('EN Extensions Hub must keep Picture Converter schema URL on /picture-converter/');
}
if (englishHtml.includes('href="/en/convert/"') || englishHtml.includes('https://layerporter.com/en/picture-converter/')) {
  throw new Error('EN Extensions Hub must not use /en/ localized routes');
}

const results = [];

for (const locale of locales) {
  const hubFile = path.join(dist, locale, 'extensions', 'index.html');
  const convertHubFile = path.join(dist, locale, 'convert', 'index.html');
  const pictureFile = path.join(dist, locale, 'picture-converter', 'index.html');

  if (!fs.existsSync(hubFile)) throw new Error(`[${locale}] Missing Extensions Hub: ${hubFile}`);
  if (!fs.existsSync(convertHubFile)) throw new Error(`[${locale}] Missing localized Convert Hub: ${convertHubFile}`);
  if (!fs.existsSync(pictureFile)) throw new Error(`[${locale}] Missing localized Picture Converter: ${pictureFile}`);

  const html = fs.readFileSync(hubFile, 'utf8');
  const convertMatches = html.match(/href="\/convert\/"/g) ?? [];
  const pictureMatches = html.split(rootPictureUrl).length - 1;

  if (convertMatches.length === 0) {
    throw new Error(`[${locale}] Expected stale /convert/ link before localization`);
  }
  if (pictureMatches === 0) {
    throw new Error(`[${locale}] Expected root Picture Converter schema URL before localization`);
  }

  const localizedConvertLink = `href="/${locale}/convert/"`;
  const localizedPictureUrl = `https://layerporter.com/${locale}/picture-converter/`;
  const localizedPictureHref = `href="/${locale}/picture-converter/"`;

  const next = html
    .replaceAll(rootConvertLink, localizedConvertLink)
    .replaceAll(rootPictureUrl, localizedPictureUrl);

  if (next.includes(rootConvertLink)) {
    throw new Error(`[${locale}] Root /convert/ link remains after localization`);
  }
  if (next.includes(rootPictureUrl)) {
    throw new Error(`[${locale}] Root Picture Converter schema URL remains after localization`);
  }

  const localizedConvertCount = (next.match(new RegExp(`href="/${locale}/convert/"`, 'g')) ?? []).length;
  if (localizedConvertCount !== convertMatches.length) {
    throw new Error(`[${locale}] Expected ${convertMatches.length} localized Web Tools links, got ${localizedConvertCount}`);
  }

  const localizedPictureCount = next.split(localizedPictureUrl).length - 1;
  if (localizedPictureCount !== pictureMatches) {
    throw new Error(`[${locale}] Expected ${pictureMatches} localized Picture Converter schema URLs, got ${localizedPictureCount}`);
  }
  if (!next.includes(localizedPictureHref)) {
    throw new Error(`[${locale}] Visible Picture Converter details link is not locale-aware`);
  }

  fs.writeFileSync(hubFile, next);
  results.push(`${locale}:convert=${localizedConvertCount},picture-schema=${localizedPictureCount}`);
}

console.log(`Extensions Hub locale routing PASS — ${results.join(', ')}; EN stays root`);
