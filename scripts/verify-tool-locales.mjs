import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const pairs = [
  {
    en: 'src/pages/tools/crop-image.astro',
    ru: 'src/pages/ru/tools/crop-image.astro',
    enPath: '/tools/crop-image/',
    ruPath: '/ru/tools/crop-image/',
    nav: '<ImageWorkspaceNav active="crop" locale="ru" />',
  },
  {
    en: 'src/pages/tools/resize-image.astro',
    ru: 'src/pages/ru/tools/resize-image.astro',
    enPath: '/tools/resize-image/',
    ruPath: '/ru/tools/resize-image/',
    nav: '<ImageWorkspaceNav active="resize" locale="ru" />',
  },
  {
    en: 'src/pages/tools/extract-audio-from-video.astro',
    ru: 'src/pages/ru/tools/extract-audio-from-video.astro',
    enPath: '/tools/extract-audio-from-video/',
    ruPath: '/ru/tools/extract-audio-from-video/',
  },
];

const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

for (const pair of pairs) {
  expect(fs.existsSync(path.join(root, pair.ru)), `missing ${pair.ru}`);
  if (!fs.existsSync(path.join(root, pair.ru))) continue;
  const en = read(pair.en);
  const ru = read(pair.ru);

  expect(en.includes(`canonicalPath="${pair.enPath}"`), `${pair.en}: canonical changed`);
  expect(ru.includes(`canonicalPath="${pair.ruPath}"`), `${pair.ru}: RU canonical missing`);
  expect(ru.includes('lang="ru"'), `${pair.ru}: lang=ru missing`);
  expect(ru.includes("hreflang: 'en'"), `${pair.ru}: EN hreflang missing`);
  expect(ru.includes("hreflang: 'ru'"), `${pair.ru}: RU hreflang missing`);
  expect(ru.includes("hreflang: 'x-default'"), `${pair.ru}: x-default missing`);
  expect(en.includes(pair.ruPath), `${pair.en}: reciprocal RU hreflang target missing`);
  expect(ru.includes("installToolRuntimeRu"), `${pair.ru}: runtime RU localization missing`);
  if (pair.nav) expect(ru.includes(pair.nav), `${pair.ru}: localized image workspace nav missing`);
}

const nav = read('src/components/ImageWorkspaceNav.astro');
expect(nav.includes("locale?: 'en' | 'ru'"), 'ImageWorkspaceNav locale contract missing');
expect(nav.includes("const prefix = locale === 'ru' ? '/ru' : ''"), 'ImageWorkspaceNav locale prefix missing');
expect(!nav.includes('video'), 'ImageWorkspaceNav must not mix video into image tools');

const bootstrap = read('src/scripts/imageWorkspaceBootstrap.ts');
expect(bootstrap.includes("path.endsWith('/tools/resize-image/')"), 'localized Resize path matching lost');
expect(bootstrap.includes("path.endsWith('/tools/crop-image/')"), 'localized Crop path matching lost');

const bridge = read('src/scripts/extensionImageBridge.ts');
expect(bridge.includes("type: 'LP_IMAGE_EDITOR_PULL'"), 'existing image extension handoff contract changed');
expect(bridge.includes('TOKEN_RE'), 'image extension token validation missing');
expect(bridge.includes('EXTENSION_ID_RE'), 'image extension id validation missing');

const sitemap = read('src/pages/sitemap.xml.ts');
for (const pair of pairs) expect(sitemap.includes(pair.ruPath), `sitemap missing ${pair.ruPath}`);

if (errors.length) {
  console.error(`Tool locale verification failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Tool locale verification passed: EN/RU routes, hreflang, image workspace and handoff contract are intact.');
