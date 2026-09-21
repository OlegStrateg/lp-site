# SEO baseline — 21.09.2026

Статус: исходная контрольная точка перед серией LP-114–LP-123.

## Источник истины

- Репозиторий: `OlegStrateg/lp-site`
- Ветка production: `master`
- Git commit: `b6b6b6bfdd4071aa2d64daaf66e6577fd55790cb`
- Последняя завершённая SEO-правка: LP-115 — внутренняя перелинковка PSD/formats/guides
- LP-115: GitHub Build PASS, production smoke PASS

## Production sitemap

На момент фиксации: **161 URL** в `https://layerporter.com/sitemap.xml`.

## Google Search Console

Источник: подключённый Search Console property `sc-domain:layerporter.com`.

Окно: **22.08.2026–18.09.2026**.

- URL-строк с показами: **88**
- Показы: **1660**
- Клики: **8**
- CTR: **0,482%**
- `www` URL с показами: **34**
- Показы `www`: **257**
- Клики `www`: **2**

`www` остаётся отдельной P0-проблемой LP-114. Исправление не считается выполненным до фактического permanent redirect `www → layerporter.com` одним hop и production-проверки.

## Контрольные URL

- `/`
- `/pinterest-downloader/`
- `/picture-converter/`
- `/convert/`
- `/convert/png-to-psd/`
- `/convert/psd-to-png/`
- `/formats/psd/`
- `/guides/export-from-ai-builders/`
- `/guides/flat-image-vs-editable-layers/`

## Автоматический baseline

Скрипт `scripts/seo-baseline-report.mjs` запускается после production build и формирует:

- `artifacts/seo-baseline/seo-baseline.json`
- `artifacts/seo-baseline/seo-baseline.md`

Он фиксирует:

- количество HTML-страниц и sitemap URL;
- canonical;
- robots;
- title/description;
- H1;
- hreflang;
- JSON-LD presence;
- внутренние ссылки на `www`;
- broken internal links;
- broken hreflang targets;
- sitemap URL без соответствующего HTML;
- indexable pages вне sitemap;
- duplicate title/description groups;
- отдельный срез контрольных URL.

Critical regressions делают CI красным.

## Правило сравнения

Каждая следующая SEO-задача должна сравниваться с этой точкой и с предыдущим production состоянием.

Контрольные окна Search Console:

- 7 дней — crawl/indexation regressions;
- 14 дней — recrawl и ранние позиции;
- 30 дней — page/query position delta;
- 60 дней — устойчивый эффект.

Не интерпретировать отсутствие мгновенного роста как провал SEO-правки до прохождения разумного окна переобхода Google.
