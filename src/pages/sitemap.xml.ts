import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Deliberately hand-rolled instead of @astrojs/sitemap for explicit control of
// what's listed. Final site: home + hub + every converter page (from the content
// collection, so a new converter .md automatically adds its entry) + the three
// static pages.
export const prerender = true;

const buildDate = new Date().toISOString().slice(0, 10);

const STATIC_PATHS = ['/', '/convert/', '/about/', '/extensions/', '/privacy/', '/terms/', '/formats/', '/guides/'];

export const GET: APIRoute = async () => {
  const converters = await getCollection('converters');
  const articles = await getCollection('articles');
  const paths = [
    ...STATIC_PATHS,
    ...converters.map((c) => `/convert/${c.data.key}/`).sort(),
    ...articles.map((a) => `/${a.data.section}/${a.data.slug}/`).sort(),
  ];
  const urls = paths
    .map((p) => `  <url>
    <loc>https://layerporter.com${p}</loc>
    <lastmod>${buildDate}</lastmod>
  </url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
