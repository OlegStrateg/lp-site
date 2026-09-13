import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const outDir = path.join(process.cwd(), 'quality-reports');
if (!fs.existsSync(dist)) throw new Error('dist/ is missing; run npm run build first');
fs.mkdirSync(outDir, { recursive: true });

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

const htmlFiles = walk(dist).filter((file) => file.endsWith('.html'));
const toRoute = (file) => {
  const rel = path.relative(dist, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
};
const routes = new Set(htmlFiles.map(toRoute));

const match = (html, re) => html.match(re)?.[1]?.trim() ?? null;
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const stripQuery = (value) => value.split('#')[0].split('?')[0];
const isAssetPath = (p) => /\.[a-z0-9]{1,8}$/i.test(p) && !p.endsWith('.html');
const targetExists = (href) => {
  const clean = stripQuery(href);
  if (!clean || clean === '/') return true;
  if (routes.has(clean) || routes.has(clean.endsWith('/') ? clean : `${clean}/`)) return true;
  const rel = clean.replace(/^\//, '');
  if (isAssetPath(clean)) return fs.existsSync(path.join(dist, rel));
  return fs.existsSync(path.join(dist, rel, 'index.html')) || fs.existsSync(path.join(dist, rel));
};

const pages = [];
const brokenLinks = [];
const brokenHreflang = [];
const titleOwners = new Map();
const descriptionOwners = new Map();

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const route = toRoute(file);
  const title = match(html, /<title>([\s\S]*?)<\/title>/i);
  const description = match(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i)
    ?? match(html, /<meta\s+content=["']([^"']*)["']\s+name=["']description["'][^>]*>/i);
  const canonical = match(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i)
    ?? match(html, /<link\s+href=["']([^"']+)["']\s+rel=["']canonical["'][^>]*>/i);
  const lang = match(html, /<html[^>]*\slang=["']([^"']+)["']/i);
  const robots = match(html, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["'][^>]*>/i)
    ?? match(html, /<meta\s+content=["']([^"']+)["']\s+name=["']robots["'][^>]*>/i);
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const ogTitle = /<meta[^>]+property=["']og:title["']/i.test(html);
  const ogImage = /<meta[^>]+property=["']og:image["']/i.test(html);
  const twitterCard = /<meta[^>]+name=["']twitter:card["']/i.test(html);
  const jsonLdCount = (html.match(/<script[^>]+type=["']application\/ld\+json["']/gi) ?? []).length;
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesWithoutAlt = imgTags.filter((tag) => !/\salt=["'][^"']*["']/i.test(tag)).length;

  if (title) {
    if (!titleOwners.has(title)) titleOwners.set(title, []);
    titleOwners.get(title).push(route);
  }
  if (description) {
    if (!descriptionOwners.has(description)) descriptionOwners.set(description, []);
    descriptionOwners.get(description).push(route);
  }

  for (const href of all(html, /<a\b[^>]*\shref=["']([^"']+)["']/gi)) {
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    if (!targetExists(href)) brokenLinks.push({ from: route, href });
  }

  for (const href of all(html, /<link\b[^>]*\srel=["']alternate["'][^>]*\shref=["']([^"']+)["']/gi)) {
    if (!href.startsWith('https://layerporter.com/')) continue;
    const target = new URL(href).pathname;
    if (!targetExists(target)) brokenHreflang.push({ from: route, href });
  }

  pages.push({
    route,
    bytes: Buffer.byteLength(html),
    title,
    titleLength: title?.length ?? 0,
    description,
    descriptionLength: description?.length ?? 0,
    canonical,
    lang,
    robots,
    h1Count,
    ogTitle,
    ogImage,
    twitterCard,
    jsonLdCount,
    images: imgTags.length,
    imagesWithoutAlt,
  });
}

const duplicateTitles = [...titleOwners.entries()]
  .filter(([, owners]) => owners.length > 1)
  .map(([value, owners]) => ({ value, owners }));
const duplicateDescriptions = [...descriptionOwners.entries()]
  .filter(([, owners]) => owners.length > 1)
  .map(([value, owners]) => ({ value, owners }));

const counts = {
  pages: pages.length,
  missingTitle: pages.filter((p) => !p.title).length,
  missingDescription: pages.filter((p) => !p.description).length,
  missingCanonical: pages.filter((p) => !p.canonical).length,
  missingLang: pages.filter((p) => !p.lang).length,
  h1NotExactlyOne: pages.filter((p) => p.h1Count !== 1).length,
  missingOgTitle: pages.filter((p) => !p.ogTitle).length,
  missingOgImage: pages.filter((p) => !p.ogImage).length,
  missingTwitterCard: pages.filter((p) => !p.twitterCard).length,
  pagesWithoutJsonLd: pages.filter((p) => p.jsonLdCount === 0).length,
  pagesWithImagesMissingAlt: pages.filter((p) => p.imagesWithoutAlt > 0).length,
  brokenInternalLinks: brokenLinks.length,
  brokenHreflangTargets: brokenHreflang.length,
  duplicateTitleGroups: duplicateTitles.length,
  duplicateDescriptionGroups: duplicateDescriptions.length,
};

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'report-only',
  counts,
  issues: {
    brokenLinks: brokenLinks.slice(0, 200),
    brokenHreflang: brokenHreflang.slice(0, 200),
    duplicateTitles: duplicateTitles.slice(0, 100),
    duplicateDescriptions: duplicateDescriptions.slice(0, 100),
  },
  pages,
};

fs.writeFileSync(path.join(outDir, 'site-quality.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'site-quality-summary.txt'), `${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join('\n')}\n`);
console.log('SITE QUALITY REPORT (REPORT-ONLY)');
for (const [key, value] of Object.entries(counts)) console.log(`${key}: ${value}`);
