import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`SEO internal-link verification failed: ${message}`);
};

const article = read('src/layouts/ArticleLayout.astro');
const converter = read('src/layouts/ConverterLayout.astro');
const home = read('src/pages/index.astro');
const hub = read('src/components/ConvertHubPage.astro');

assert(article.includes('href={`/${d.section}/`}'), 'article breadcrumb does not link to its section hub');
assert(article.includes("'/formats/psd/'"), 'article related reading does not link to PSD guide');
assert(article.includes("'/guides/flat-image-vs-editable-layers/'"), 'article related reading misses flat-image guide');
assert(article.includes("'/guides/export-from-ai-builders/'"), 'article related reading misses AI-builders guide');

for (const key of ['png-to-psd', 'jpg-to-psd', 'psd-to-png', 'psd-to-jpg']) {
  assert(converter.includes(`'${key}'`), `PSD learning allow-list missing ${key}`);
}
assert(converter.includes('href="/formats/psd/"'), 'PSD converters do not link to PSD guide');
assert(converter.includes('href="/guides/flat-image-vs-editable-layers/"'), 'PSD converters do not link to flat-image guide');
assert(home.includes('href="/formats/"'), 'home does not expose format hub');
assert(hub.includes('href="/formats/"'), 'convert hub does not expose format hub');
assert(hub.includes('href="/formats/psd/"'), 'convert hub does not expose PSD guide');

console.log('SEO internal-link verification: PASS');
