# Convert Hub i18n / SEO — LP-054

Дата: 2026-09-05

## Решение

`/convert/` публикуется на том же каноническом наборе языков, что и Picture Converter: 49 уникальных локалей.

Источник списка локалей: `scripts/picture-converter-locales-data.mjs`.

Региональные дубли для Convert Hub не создаются:
- `es-419`;
- `pt-PT`;
- `zh-TW`.

Канонические региональные версии:
- Spanish → `/es/convert/`;
- Portuguese → `/pt-br/convert/`;
- Chinese → `/zh-cn/convert/`.

English → `/convert/`.
Остальные языки → `/<locale>/convert/`.

## SEO

Для каждой опубликованной локали обязательны:
- self-canonical;
- reciprocal hreflang со всеми 49 реально опубликованными Convert Hub локалями;
- `x-default` → `https://layerporter.com/convert/`;
- корректный `html lang`;
- `inLanguage` в `CollectionPage` schema;
- общий репрезентативный preferred image `/og/convert.png` 1200×630;
- URL в `sitemap.xml`.

Нельзя создавать региональный URL с дублированным текстом только ради количества страниц.

## Текстовые источники

Полный отдельный Convert Hub copy зафиксирован для EN, RU, DE, ES, FR, PT-BR, JA, ZH-CN.

Для остальных языков LP-054 использует уже утверждённые локализованные v10-тексты Picture Converter как консервативный source-backed baseline и нейтральные обозначения форматов (`JPG → PDF`, `PSD → PNG` и т.п.). Непроверенные SEO-ключи не выдумываются.

Следующая языковая SEO-итерация по конкретной локали должна заменять baseline только после проверки локальной семантики/употребления и не должна менять URL или hreflang без отдельного решения.

## Архитектура

- Один общий компонент: `src/components/ConvertHubPage.astro`.
- Полный словарь основных локалей: `src/data/convertHubLocales.ts`.
- Расширение до 49 канонических локалей: `src/data/convertHubAllLocales.ts`.
- Динамический статический маршрут: `src/pages/[locale]/convert/index.astro`.
- English route: `src/pages/convert/index.astro`.
- Общий дизайн: `public/convert-hub.css`.
- Защита локализованной верстки и language menu: `public/convert-hub-i18n.css`.

Дочерние страницы конвертеров (`/convert/jpg-to-pdf/` и т.д.) в LP-054 остаются существующими canonical English routes. Локализованные дочерние URL нельзя придумывать до отдельной локализации этих страниц.

## Автопроверка

`scripts/verify-convert-hub.mjs` обязан падать, если:
- отсутствует хотя бы одна из 49 canonical locale pages;
- создан `es-419`, `pt-pt` или `zh-tw` Convert Hub;
- сломан self-canonical;
- нет любого reciprocal hreflang;
- `x-default` не указывает на English `/convert/`;
- пропала одна из 9 tool routes;
- локаль отсутствует в sitemap;
- сломан preferred image `/og/convert.png`.
