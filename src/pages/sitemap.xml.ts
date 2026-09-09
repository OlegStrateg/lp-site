import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { PICTURE_CONVERTER_LOCALES, pictureConverterPath } from '../../scripts/picture-converter-locales-data.mjs';
import { CONVERT_HUB_LOCALES, convertHubPath } from '../data/convertHubLocales';

// Deliberately hand-rolled instead of @astrojs/sitemap for explicit control of
// what's listed. Final site: home + hub + every converter page (from the content
// collection, so a new converter .md automatically adds its EN entry) + localized
// exact converters + static hubs/pages.
export const prerender = true;

const PINTEREST_LOCALE_PATHS = [
  "/pinterest-downloader/",
  "/am/pinterest-downloader/",
  "/ar/pinterest-downloader/",
  "/bg/pinterest-downloader/",
  "/bn/pinterest-downloader/",
  "/ca/pinterest-downloader/",
  "/cs/pinterest-downloader/",
  "/da/pinterest-downloader/",
  "/de/pinterest-downloader/",
  "/el/pinterest-downloader/",
  "/es/pinterest-downloader/",
  "/es-419/pinterest-downloader/",
  "/et/pinterest-downloader/",
  "/fa/pinterest-downloader/",
  "/fi/pinterest-downloader/",
  "/fil/pinterest-downloader/",
  "/fr/pinterest-downloader/",
  "/gu/pinterest-downloader/",
  "/he/pinterest-downloader/",
  "/hi/pinterest-downloader/",
  "/hr/pinterest-downloader/",
  "/hu/pinterest-downloader/",
  "/id/pinterest-downloader/",
  "/it/pinterest-downloader/",
  "/ja/pinterest-downloader/",
  "/kn/pinterest-downloader/",
  "/ko/pinterest-downloader/",
  "/lt/pinterest-downloader/",
  "/lv/pinterest-downloader/",
  "/ml/pinterest-downloader/",
  "/mr/pinterest-downloader/",
  "/ms/pinterest-downloader/",
  "/nl/pinterest-downloader/",
  "/no/pinterest-downloader/",
  "/pl/pinterest-downloader/",
  "/pt-br/pinterest-downloader/",
  "/pt-pt/pinterest-downloader/",
  "/ro/pinterest-downloader/",
  "/ru/pinterest-downloader/",
  "/sk/pinterest-downloader/",
  "/sl/pinterest-downloader/",
  "/sr/pinterest-downloader/",
  "/sv/pinterest-downloader/",
  "/sw/pinterest-downloader/",
  "/ta/pinterest-downloader/",
  "/te/pinterest-downloader/",
  "/th/pinterest-downloader/",
  "/tr/pinterest-downloader/",
  "/uk/pinterest-downloader/",
  "/vi/pinterest-downloader/",
  "/zh-cn/pinterest-downloader/",
  "/zh-tw/pinterest-downloader/"
];

const PICTURE_CONVERTER_LOCALE_PATHS = PICTURE_CONVERTER_LOCALES.map(pictureConverterPath);
const CONVERT_HUB_LOCALE_PATHS = CONVERT_HUB_LOCALES.map(convertHubPath);
const LOCALIZED_EXACT_CONVERTER_PATHS = [
  '/pt-br/convert/jpg-to-pdf/',
  '/pt-br/convert/webp-to-jpg/',
  '/pt-br/convert/png-to-psd/',
  '/pt-br/convert/jpg-to-psd/',
];

const STATIC_PATHS = ['/', '/ru/', '/de/', '/es/', '/fr/', '/pt-br/', '/ja/', '/zh-cn/', '/about/', '/extensions/', '/ru/extensions/', '/de/extensions/', '/es/extensions/', '/fr/extensions/', '/pt-br/extensions/', '/ja/extensions/', '/zh-cn/extensions/', '/privacy/', '/terms/', '/formats/', '/guides/'];

export const GET: APIRoute = async () => {
  const converters = await getCollection('converters');
  const articles = await getCollection('articles');
  const paths = [
    ...STATIC_PATHS,
    ...CONVERT_HUB_LOCALE_PATHS,
    ...LOCALIZED_EXACT_CONVERTER_PATHS,
    ...PINTEREST_LOCALE_PATHS,
    ...PICTURE_CONVERTER_LOCALE_PATHS,
    ...converters.map((c) => `/convert/${c.data.key}/`).sort(),
    ...articles.map((a) => `/${a.data.section}/${a.data.slug}/`).sort(),
  ];
  const urls = [...new Set(paths)]
    .map((p) => `  <url>\n    <loc>https://layerporter.com${p}</loc>\n  </url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};