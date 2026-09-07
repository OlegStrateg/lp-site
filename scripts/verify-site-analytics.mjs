import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(`site analytics verification failed: ${message}`);
}

const analytics = read('src/lib/analytics.ts');
const collector = read('functions/api/collect.js');
const baseLayout = read('src/layouts/BaseLayout.astro');
const home = read('src/pages/index.astro');
const productEntry = read('src/pages/internal-product-analytics-entry.astro');
const productInjector = read('scripts/inject-product-landing-analytics.mjs');
const robots = read('public/robots.txt');
const sitemap = read('src/pages/sitemap.xml.ts');
const headers = read('public/_headers');

// Transport must stay first-party and active.
assert(analytics.includes("const ANALYTICS_ENDPOINT = '/api/collect'"), 'first-party endpoint is not enabled');
assert(analytics.includes("const SITE_PRODUCT = 'site'"), 'site product code missing');
assert(analytics.includes('navigator.sendBeacon'), 'sendBeacon transport missing');
assert(analytics.includes("clean.route = routeBucket(window.location.pathname)"), 'route bucketing missing');
assert(!analytics.includes('ANALYTICS_ENDPOINT: string | null = null'), 'analytics regressed to no-op');

// Core site analytics must not call browser-persistence APIs. Match actual member
// access, not documentation text such as "sessionStorage." at the end of a sentence.
for (const [label, pattern] of [
  ['sessionStorage', /\bsessionStorage\s*\.\s*(?:getItem|setItem|removeItem|clear|key|length)\b/],
  ['localStorage', /\blocalStorage\s*\.\s*(?:getItem|setItem|removeItem|clear|key|length)\b/],
  ['document.cookie', /\bdocument\s*\.\s*cookie\s*=/],
]) {
  assert(!pattern.test(analytics), `core analytics uses forbidden browser storage: ${label}`);
  assert(!pattern.test(productEntry), `product analytics uses forbidden browser storage: ${label}`);
}
assert(analytics.includes("const PAGE_ID = typeof window !== 'undefined' ? uuidV4() : ''"), 'page-scoped id missing');

// Privacy guardrails: arbitrary URL/text/file content must not be accepted as properties.
for (const forbidden of ['url', 'href', 'text', 'path', 'content', 'html', 'email']) {
  assert(analytics.includes(`'${forbidden}'`), `client forbidden property ${forbidden} missing`);
  assert(collector.includes(`'${forbidden}'`), `collector forbidden property ${forbidden} missing`);
}
assert(analytics.includes("return '/other/'"), 'unknown route bucket missing');
assert(collector.includes("return '/other/'"), 'server unknown route bucket missing');
assert(analytics.includes("[a-z]{2,3}(?:-[a-z0-9]{2,4})?"), 'client locale route pattern incomplete');
assert(collector.includes("[a-z]{2,3}(?:-[a-z0-9]{2,4})?"), 'server locale route pattern incomplete');

// Collector must preserve old extension products and add the isolated site product.
for (const product of ['ic', 'h2f', 'pex', 's2c', 'ds', 'pd', 'site']) {
  assert(collector.includes(`'${product}'`), `collector product ${product} missing`);
}
for (const event of [
  'page_view', 'tool_view', 'upload_start', 'convert_success', 'convert_error',
  'download_click', 'cross_sell_click', 'universal_drop', 'universal_route_click',
  'extension_cta_click', 'extension_store_click',
]) {
  assert(collector.includes(`'${event}'`), `site event ${event} missing from allow-list`);
}
assert(collector.includes('saveSiteEvent'), 'site persistence missing');
assert(collector.includes('siteStatsForDays'), 'site stats aggregation missing');
assert(collector.includes('raw.p !== \'site\''), 'extension owner-test isolation missing');
assert(collector.includes('page_instances'), 'page-scoped metric naming missing');

// Existing page instrumentation must remain connected.
assert(baseLayout.includes("track('page_view'"), 'BaseLayout page_view missing');
assert(home.includes("track('page_view'"), 'home page_view missing');
assert(home.includes("track('path_card_click'"), 'home path click event missing');

// Product landings use the same shared track() transport. The build-only entry is
// injected after the two locale generators and then removed as a public route.
assert(productEntry.includes("import { track } from '../lib/analytics'"), 'product landing does not reuse shared track()');
assert(productEntry.includes("track('page_view'"), 'product landing page_view missing');
assert(productEntry.includes("track('extension_store_click'"), 'product landing Store click missing');
assert(productEntry.includes("'picture_converter'"), 'Picture Converter product code missing');
assert(productEntry.includes("'pinterest_downloader'"), 'Pinterest Downloader product code missing');
assert(productEntry.includes('oegpbmdpckfdgodnkdnoggedamfflfcl'), 'Picture Converter Store ID missing');
assert(productEntry.includes('nmpahchhmcdejmfcmkphnbhckmlhhnon'), 'Pinterest Store ID missing');
assert(!productEntry.includes('fetch('), 'product entry duplicates analytics fetch transport');
assert(!productEntry.includes('sendBeacon'), 'product entry duplicates beacon transport');
assert(productInjector.includes('lp-product-analytics:v1'), 'product analytics injection marker missing');
assert(productInjector.includes('picture-converter-locales.json'), 'Picture Converter manifest injection missing');
assert(productInjector.includes('pinterest-locales.json'), 'Pinterest manifest injection missing');
assert(productInjector.includes('targets.length'), 'product analytics target verification missing');
assert(productInjector.includes('Internal analytics entry leaked into dist'), 'internal entry cleanup gate missing');

// Indexing invariants.
assert(robots.includes('User-agent: *'), 'robots wildcard missing');
assert(robots.includes('Allow: /'), 'robots indexing is not open');
assert(robots.includes('Sitemap: https://layerporter.com/sitemap.xml'), 'robots sitemap pointer missing');
assert(sitemap.includes('CONVERT_HUB_LOCALE_PATHS'), 'Convert Hub locales missing from sitemap');
assert(sitemap.includes('PICTURE_CONVERTER_LOCALE_PATHS'), 'Picture Converter locales missing from sitemap');
assert(sitemap.includes('PINTEREST_LOCALE_PATHS'), 'Pinterest locales missing from sitemap');
assert(sitemap.includes("getCollection('converters')"), 'converter collection missing from sitemap');
assert(sitemap.includes("getCollection('articles')"), 'article collection missing from sitemap');
assert(headers.includes('X-Robots-Tag: noindex'), 'preview/internal noindex guard missing');

console.log('site analytics + indexing verification: PASS');
