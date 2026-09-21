import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const OUT_DIR = path.resolve('artifacts/seo-baseline');
const ORIGIN = 'https://layerporter.com';

const CONTROL_PATHS = [
  '/',
  '/pinterest-downloader/',
  '/picture-converter/',
  '/convert/',
  '/convert/png-to-psd/',
  '/convert/psd-to-png/',
  '/formats/psd/',
  '/guides/export-from-ai-builders/',
  '/guides/flat-image-vs-editable-layers/',
];

function assert(condition, message) {
  if (!condition) throw new Error(`SEO baseline failed: ${message}`);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function routeForHtml(file) {
  const rel = path.relative(DIST, file).replaceAll(path.sep, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  if (rel.endsWith('.html')) return '/' + rel.slice(0, -'.html'.length);
  return null;
}

function parseAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+)))?/g)) {
    const key = m[1].toLowerCase();
    if (key === tag.match(/^<\/?\s*([^\s>]+)/)?.[1]?.toLowerCase()) continue;
    attrs[key] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => m[0]);
}

function findMeta(html, name) {
  for (const tag of tags(html, 'meta')) {
    const a = parseAttrs(tag);
    if ((a.name || '').toLowerCase() === name.toLowerCase()) return a.content || '';
  }
  return '';
}

function findCanonical(html) {
  for (const tag of tags(html, 'link')) {
    const a = parseAttrs(tag);
    if ((a.rel || '').toLowerCase().split(/\s+/).includes('canonical')) return a.href || '';
  }
  return '';
}

function hreflangs(html) {
  const out = [];
  for (const tag of tags(html, 'link')) {
    const a = parseAttrs(tag);
    if ((a.rel || '').toLowerCase().split(/\s+/).includes('alternate') && a.hreflang && a.href) {
      out.push({ hreflang: a.hreflang, href: a.href });
    }
  }
  return out;
}

function titleOf(html) {
  return (html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
}

function h1s(html) {
  return [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function anchorHrefs(html) {
  const out = [];
  for (const tag of tags(html, 'a')) {
    const a = parseAttrs(tag);
    if (a.href) out.push(a.href);
  }
  return out;
}

function normalizeInternalHref(href, fromRoute) {
  if (!href || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  try {
    const base = new URL(fromRoute, ORIGIN);
    const url = new URL(href, base);
    if (url.hostname !== 'layerporter.com' && url.hostname !== 'www.layerporter.com') return null;
    url.hash = '';
    url.search = '';
    return url.pathname || '/';
  } catch {
    return null;
  }
}

function expectedCanonical(route) {
  return ORIGIN + route;
}

assert(fs.existsSync(DIST), 'dist directory does not exist; run the production build first');

const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const pages = [];

for (const file of htmlFiles) {
  const route = routeForHtml(file);
  if (!route) continue;
  const html = fs.readFileSync(file, 'utf8');
  const title = titleOf(html);
  const description = findMeta(html, 'description');
  const canonical = findCanonical(html);
  const robots = findMeta(html, 'robots');
  const h1 = h1s(html);
  const alt = hreflangs(html);
  const anchors = anchorHrefs(html);
  const wwwInternalLinks = anchors.filter((href) => /^https:\/\/www\.layerporter\.com\//i.test(href));
  const jsonLdCount = (html.match(/type=["']application\/ld\+json["']/gi) || []).length;

  pages.push({
    route,
    file: path.relative(process.cwd(), file).replaceAll(path.sep, '/'),
    title,
    description,
    canonical,
    robots,
    h1,
    hreflang: alt,
    internalHrefs: anchors.map((href) => normalizeInternalHref(href, route)).filter(Boolean),
    wwwInternalLinks,
    jsonLdCount,
  });
}

const routeSet = new Set(pages.map((p) => p.route));
const pageByRoute = new Map(pages.map((p) => [p.route, p]));
const sitemapPath = path.join(DIST, 'sitemap.xml');
assert(fs.existsSync(sitemapPath), 'dist/sitemap.xml is missing');
const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
const sitemapRoutes = sitemapUrls.map((url) => {
  try { return new URL(url).pathname; } catch { return null; }
}).filter(Boolean);
const sitemapRouteSet = new Set(sitemapRoutes);

const missingCanonical = pages.filter((p) => !p.canonical).map((p) => p.route);
const canonicalMismatch = pages
  .filter((p) => p.canonical && p.canonical !== expectedCanonical(p.route))
  .map((p) => ({ route: p.route, canonical: p.canonical, expected: expectedCanonical(p.route) }));
const noindex = pages.filter((p) => /\bnoindex\b/i.test(p.robots)).map((p) => p.route);
const missingTitle = pages.filter((p) => !p.title).map((p) => p.route);
const missingDescription = pages.filter((p) => !p.description).map((p) => p.route);
const h1Problems = pages.filter((p) => p.h1.length !== 1).map((p) => ({ route: p.route, count: p.h1.length, h1: p.h1 }));
const wwwInternalLinks = pages
  .filter((p) => p.wwwInternalLinks.length)
  .map((p) => ({ route: p.route, hrefs: [...new Set(p.wwwInternalLinks)] }));

const brokenInternalLinks = [];
for (const p of pages) {
  for (const target of [...new Set(p.internalHrefs)]) {
    if (
      target.startsWith('/api/') ||
      target.startsWith('/cdn-cgi/') ||
      /\.[a-z0-9]{2,5}$/i.test(target)
    ) continue;
    const normalized = target.endsWith('/') ? target : target + '/';
    if (!routeSet.has(target) && !routeSet.has(normalized)) {
      brokenInternalLinks.push({ from: p.route, to: target });
    }
  }
}

const brokenHreflangTargets = [];
for (const p of pages) {
  for (const item of p.hreflang) {
    let u;
    try { u = new URL(item.href); } catch { continue; }
    if (u.hostname !== 'layerporter.com') continue;
    const target = u.pathname;
    if (!routeSet.has(target)) {
      brokenHreflangTargets.push({ from: p.route, hreflang: item.hreflang, to: target });
    }
  }
}

const sitemapMissingFiles = sitemapRoutes.filter((route) => !routeSet.has(route));
const indexableNotInSitemap = pages
  .filter((p) => !/\bnoindex\b/i.test(p.robots))
  .filter((p) => !sitemapRouteSet.has(p.route))
  .map((p) => p.route);

const titleGroups = new Map();
const descriptionGroups = new Map();
for (const p of pages) {
  if (p.title) {
    const key = p.title.trim().toLowerCase();
    if (!titleGroups.has(key)) titleGroups.set(key, []);
    titleGroups.get(key).push(p.route);
  }
  if (p.description) {
    const key = p.description.trim().toLowerCase();
    if (!descriptionGroups.has(key)) descriptionGroups.set(key, []);
    descriptionGroups.get(key).push(p.route);
  }
}
const duplicateTitles = [...titleGroups.entries()].filter(([, routes]) => routes.length > 1).map(([value, routes]) => ({ value, routes }));
const duplicateDescriptions = [...descriptionGroups.entries()].filter(([, routes]) => routes.length > 1).map(([value, routes]) => ({ value, routes }));

const controls = CONTROL_PATHS.map((route) => {
  const p = pageByRoute.get(route);
  return {
    route,
    exists: Boolean(p),
    title: p?.title || '',
    canonical: p?.canonical || '',
    robots: p?.robots || '',
    h1Count: p?.h1.length ?? 0,
    hreflangCount: p?.hreflang.length ?? 0,
    jsonLdCount: p?.jsonLdCount ?? 0,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  gitCommit: process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null,
  origin: ORIGIN,
  summary: {
    htmlPages: pages.length,
    sitemapUrls: sitemapUrls.length,
    indexablePages: pages.length - noindex.length,
    noindexPages: noindex.length,
    missingCanonical: missingCanonical.length,
    canonicalMismatch: canonicalMismatch.length,
    missingTitle: missingTitle.length,
    missingDescription: missingDescription.length,
    h1Problems: h1Problems.length,
    wwwInternalLinkPages: wwwInternalLinks.length,
    brokenInternalLinks: brokenInternalLinks.length,
    brokenHreflangTargets: brokenHreflangTargets.length,
    sitemapMissingFiles: sitemapMissingFiles.length,
    indexableNotInSitemap: indexableNotInSitemap.length,
    duplicateTitleGroups: duplicateTitles.length,
    duplicateDescriptionGroups: duplicateDescriptions.length,
  },
  controls,
  issues: {
    missingCanonical,
    canonicalMismatch,
    noindex,
    missingTitle,
    missingDescription,
    h1Problems,
    wwwInternalLinks,
    brokenInternalLinks,
    brokenHreflangTargets,
    sitemapMissingFiles,
    indexableNotInSitemap,
    duplicateTitles,
    duplicateDescriptions,
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'seo-baseline.json'), JSON.stringify(report, null, 2) + '\n');

const md = [
  '# LayerPorter SEO baseline',
  '',
  `Generated: ${report.generatedAt}`,
  `Git commit: ${report.gitCommit || 'local/unknown'}`,
  '',
  '## Summary',
  '',
  '| Metric | Value |',
  '|---|---:|',
  ...Object.entries(report.summary).map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '## Control URLs',
  '',
  '| URL | Exists | Canonical | Robots | H1 | hreflang | JSON-LD |',
  '|---|---|---|---|---:|---:|---:|',
  ...controls.map((c) => `| ${c.route} | ${c.exists ? 'yes' : 'NO'} | ${c.canonical || '—'} | ${c.robots || '—'} | ${c.h1Count} | ${c.hreflangCount} | ${c.jsonLdCount} |`),
  '',
  '## Critical issue counts',
  '',
  `- www internal-link pages: ${wwwInternalLinks.length}`,
  `- canonical mismatches: ${canonicalMismatch.length}`,
  `- broken internal links: ${brokenInternalLinks.length}`,
  `- broken hreflang targets: ${brokenHreflangTargets.length}`,
  `- sitemap URLs without built HTML: ${sitemapMissingFiles.length}`,
  '',
].join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'seo-baseline.md'), md);

for (const c of controls) {
  assert(c.exists, `control URL missing from build: ${c.route}`);
  assert(c.canonical === expectedCanonical(c.route), `control canonical mismatch: ${c.route} -> ${c.canonical}`);
  assert(!/\bnoindex\b/i.test(c.robots), `control URL is noindex: ${c.route}`);
  assert(c.h1Count === 1, `control URL must have exactly one H1: ${c.route}, found ${c.h1Count}`);
}
assert(wwwInternalLinks.length === 0, `found www internal links on ${wwwInternalLinks.length} pages`);
assert(canonicalMismatch.length === 0, `found ${canonicalMismatch.length} canonical mismatches`);
assert(brokenHreflangTargets.length === 0, `found ${brokenHreflangTargets.length} broken hreflang targets`);
assert(sitemapMissingFiles.length === 0, `found ${sitemapMissingFiles.length} sitemap URLs without built HTML`);

console.log('SEO baseline report: PASS');
console.log(JSON.stringify(report.summary));
