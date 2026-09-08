import fs from 'node:fs';
import path from 'node:path';

const locales = ['ru', 'de', 'es', 'fr', 'pt-br', 'ja', 'zh-cn'];
const rootLink = 'href="/convert/"';

const englishHome = path.join(process.cwd(), 'dist', 'index.html');
if (!fs.existsSync(englishHome)) throw new Error('Missing EN Home: dist/index.html');
const englishHtml = fs.readFileSync(englishHome, 'utf8');
if (!englishHtml.includes(rootLink)) {
  throw new Error('EN Home must keep Web Tools routed to /convert/');
}
if (englishHtml.includes('href="/en/convert/"')) {
  throw new Error('EN Home must not use /en/convert/');
}

const results = [];

for (const locale of locales) {
  const homeFile = path.join(process.cwd(), 'dist', locale, 'index.html');
  const hubFile = path.join(process.cwd(), 'dist', locale, 'convert', 'index.html');
  if (!fs.existsSync(homeFile)) throw new Error(`[${locale}] Missing localized Home: ${homeFile}`);
  if (!fs.existsSync(hubFile)) throw new Error(`[${locale}] Missing localized Convert Hub: ${hubFile}`);

  const html = fs.readFileSync(homeFile, 'utf8');
  const matches = html.match(/href="\/convert\/"/g) ?? [];
  if (matches.length === 0) {
    throw new Error(`[${locale}] Expected at least one stale /convert/ Home link before localization`);
  }

  const localizedLink = `href="/${locale}/convert/"`;
  const next = html.replaceAll(rootLink, localizedLink);

  if (next.includes(rootLink)) {
    throw new Error(`[${locale}] Root /convert/ Home link remains after localization`);
  }
  const localizedCount = (next.match(new RegExp(`href="/${locale}/convert/"`, 'g')) ?? []).length;
  if (localizedCount !== matches.length) {
    throw new Error(`[${locale}] Expected ${matches.length} localized Web Tools links, got ${localizedCount}`);
  }

  fs.writeFileSync(homeFile, next);
  results.push(`${locale}:${localizedCount}`);
}

console.log(`Home Web Tools locale routing PASS — ${results.join(', ')}; EN stays /convert/`);
