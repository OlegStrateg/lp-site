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
const homePaths = [
  'src/pages/index.astro',
  'src/pages/ru/index.astro',
  'src/pages/de/index.astro',
  'src/pages/es/index.astro',
  'src/pages/fr/index.astro',
  'src/pages/pt-br/index.astro',
  'src/pages/ja/index.astro',
  'src/pages/zh-cn/index.astro',
];
const homes = homePaths.map((path) => [path, read(path)]);
const productEntry = read('src/pages/internal-product-analytics-entry.astro');
const productInjector = read('scripts/inject-product-landing-analytics.mjs');
const extensionsEntry = read('src/pages/internal-extensions-analytics-entry.astro');
const extensionsInjector = read('scripts/inject-extensions-hub-analytics.mjs');
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
  assert(!pattern.test(extensionsEntry), `extensions analytics uses forbidden browser storage: ${label}`);
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
  'page_view', 'path_card_click', 'tool_view', 'upload_start', 'convert_success', 'convert_error',
  'download_click', 'cross_sell_click', 'universal_drop', 'universal_route_click',
  'extension_cta_click', 'extension_store_click',
]) {
  assert(collector.includes(`'${event}'`), `site event ${event} missing from allow-list`);
}
assert(collector.includes('saveSiteEvent'), 'site persistence missing');
assert(collector.includes('siteStatsForDays'), 'site stats aggregation missing');
assert(collector.includes('raw.p !== \'site\''), 'extension owner-test isolation missing');
assert(collector.includes('page_instances'), 'page-scoped metric naming missing');

// extension_store_click keeps a safe product dimension so two CWS buttons on the
// same Extensions Hub route can be compared without storing URL/text.
assert(collector.includes("SITE_STORE_PRODUCTS = new Set(['picture_converter', 'pinterest_downloader'])"), 'Store product allow-list missing');
assert(collector.includes('safeSiteStoreProduct'), 'safe Store product classifier missing');
assert(collector.includes('productSuffix'), 'Store product dimension is not persisted');
assert(collector.includes('extension_store_click_by_product'), 'Store product stats breakdown missing');
assert(collector.includes("unknown: 0"), 'legacy/unknown Store clicks are not kept backward-compatible');

// Home EN + 7 locale pages keep one existing inline event path, while the shared
// adapter fills only the two historical gaps: localized /extensions/ and Picture Converter.
for (const [path, source] of homes) {
  assert(source.includes("track('page_view'"), `${path}: page_view missing`);
  assert(source.includes("track('path_card_click'"), `${path}: path click event missing`);
}
for (const target of [
  'home_extensions',
  'home_pinterest_downloader',
  'home_picture_converter',
  'home_web_tools',
]) {
  assert(analytics.includes(`'${target}'`), `home funnel target ${target} missing`);
}
assert(analytics.includes('classifyHomeDestination'), 'home destination classifier missing');
assert(analytics.includes('installMissingHomeClickCoverage'), 'home missing-click coverage missing');
assert(analytics.includes('LOCALIZED_EXTENSIONS_ROUTE.test(path)'), 'localized extension coverage missing');
assert(analytics.includes("target === 'home_picture_converter'"), 'Picture Converter coverage missing');
assert(analytics.includes("typeof props.href === 'string'"), 'existing Home href classifier bridge missing');
assert(analytics.includes('cleanProps(normalizedProps)'), 'classified Home props do not pass through sanitizer');

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

// Extensions Hub EN + 7 reuse the shared track() transport. EN already receives
// page_view from BaseLayout; only standalone localized hubs emit an injected page_view.
assert(extensionsEntry.includes("import { track } from '../lib/analytics'"), 'Extensions Hub does not reuse shared track()');
assert(extensionsEntry.includes("if (localizedHub) track('page_view'"), 'localized Extensions page_view missing');
assert(!extensionsEntry.includes("if (englishHub) track('page_view'"), 'EN Extensions page_view would be duplicated');
assert(extensionsEntry.includes("track('extension_store_click'"), 'Extensions Hub Store click missing');
assert(extensionsEntry.includes("product: 'pinterest_downloader'"), 'Pinterest Hub product code missing');
assert(extensionsEntry.includes("product: 'picture_converter'"), 'Picture Hub product code missing');
assert(extensionsEntry.includes('nmpahchhmcdejmfcmkphnbhckmlhhnon'), 'Pinterest Hub Store ID missing');
assert(extensionsEntry.includes('oegpbmdpckfdgodnkdnoggedamfflfcl'), 'Picture Hub Store ID missing');
assert(!extensionsEntry.includes('fetch('), 'Extensions entry duplicates analytics fetch transport');
assert(!extensionsEntry.includes('sendBeacon'), 'Extensions entry duplicates beacon transport');
assert(extensionsInjector.includes('lp-extensions-analytics:v1'), 'Extensions analytics injection marker missing');
assert(extensionsInjector.includes('targets.length}/8'), 'Extensions analytics target count gate missing');
assert(extensionsInjector.includes('Internal Extensions analytics entry leaked into dist'), 'Extensions internal entry cleanup gate missing');

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
