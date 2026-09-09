import fs from 'node:fs';
import path from 'node:path';

const expected = [
  ['/pt-br/convert/jpg-to-pdf/', 'pt-BR'],
  ['/pt-br/convert/webp-to-jpg/', 'pt-BR'],
  ['/pt-br/convert/favicon-generator/', 'pt-BR'],
  ['/pt-br/convert/png-to-psd/', 'pt-BR'],
  ['/pt-br/convert/jpg-to-psd/', 'pt-BR'],
  ['/pt-br/convert/psd-to-jpg/', 'pt-BR'],
  ['/pt-br/convert/psd-to-png/', 'pt-BR'],
];

for (const [route, lang] of expected) {
  const file = path.join(process.cwd(), 'dist', ...route.split('/').filter(Boolean), 'index.html');
  if (!fs.existsSync(file)) throw new Error(`Missing localized exact converter: ${file}`);
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes(`lang="${lang}"`)) throw new Error(`Wrong/missing lang on ${route}`);
  if (!html.includes(`<link rel="canonical" href="https://layerporter.com${route}">`)) throw new Error(`Wrong/missing canonical on ${route}`);
  if ((html.match(/<h1\b/g) || []).length !== 1) throw new Error(`Expected exactly one H1 on ${route}`);
}

const psdJpgFile = path.join(process.cwd(), 'dist', 'pt-br', 'convert', 'psd-to-jpg', 'index.html');
const psdJpg = fs.readFileSync(psdJpgFile, 'utf8');
for (const marker of [
  'Converter PSD para JPG',
  'qualidade JPG fixa de 92%',
  'Adicionar Picture Converter ao Chrome',
  'oegpbmdpckfdgodnkdnoggedamfflfcl',
]) {
  if (!psdJpg.includes(marker)) throw new Error(`PT-BR PSD→JPG missing marker: ${marker}`);
}

const psdPngFile = path.join(process.cwd(), 'dist', 'pt-br', 'convert', 'psd-to-png', 'index.html');
const psdPng = fs.readFileSync(psdPngFile, 'utf8');
for (const marker of [
  'Converter PSD para PNG',
  'Transparência preservada',
  'Maximize Compatibility',
  'Adicionar Picture Converter ao Chrome',
]) {
  if (!psdPng.includes(marker)) throw new Error(`PT-BR PSD→PNG missing marker: ${marker}`);
}

const faviconFile = path.join(process.cwd(), 'dist', 'pt-br', 'convert', 'favicon-generator', 'index.html');
const favicon = fs.readFileSync(faviconFile, 'utf8');
for (const marker of [
  'Gerador de favicon',
  'favicon.ico',
  '16, 32, 48, 180, 192 e 512 px',
  'As tags HTML são mostradas na página',
  'Adicionar Picture Converter ao Chrome',
]) {
  if (!favicon.includes(marker)) throw new Error(`PT-BR Favicon missing marker: ${marker}`);
}

const ptBrHubFile = path.join(process.cwd(), 'dist', 'pt-br', 'convert', 'index.html');
const ptBrHub = fs.readFileSync(ptBrHubFile, 'utf8');
for (const route of ['/pt-br/convert/favicon-generator/', '/pt-br/convert/psd-to-jpg/', '/pt-br/convert/psd-to-png/']) {
  if (!ptBrHub.includes(`href="${route}"`)) throw new Error(`PT-BR hub missing localized route: ${route}`);
}

const sitemap = fs.readFileSync(path.join(process.cwd(), 'dist', 'sitemap.xml'), 'utf8');
for (const [route] of expected) {
  if (!sitemap.includes(`<loc>https://layerporter.com${route}</loc>`)) throw new Error(`Sitemap missing ${route}`);
}

console.log(`Localized exact converters PASS: ${expected.length} routes`);
