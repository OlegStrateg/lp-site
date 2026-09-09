# LP-078 — Шаг 13/30: Page-aware image analysis

Дата: 2026-09-09
Статус: DONE / CODED
Ветка: `feat/LP-078-image-optimizer-mcp-core`
Issue: #186 / LP-078

## Что реализовано

Добавлен детерминированный слой анализа использования изображений на странице без привязки image-core к Playwright или конкретному браузерному рантайму.

Новые API:
- `analyzeImageUsage(imageFacts)`;
- `analyzePageImages(pageSnapshot)`.

Snapshot принимает факты, уже собранные браузером/collector-слоем:
- currentSrc/src;
- intrinsic width/height;
- rendered width/height;
- devicePixelRatio;
- bytes;
- format;
- srcset;
- sizes;
- loading;
- fetchPriority;
- width/height attributes;
- confirmed LCP boolean;
- hero/decorative hints.

## Детерминированные выводы

1. Oversize ratio считается относительно rendered size × DPR, а не просто CSS width.
2. Hero candidate не считается подтверждённым LCP.
3. LCP-specific fixes выдаются только при `lcp === true`.
4. `srcset` без `sizes` классифицируется REVIEW, не SAFE.
5. Missing width/height при известных размерах классифицируется SAFE.
6. Lazy loading confirmed LCP — high severity SAFE finding.
7. Missing fetchpriority для confirmed LCP — medium severity SAFE finding.
8. Findings сортируются по severity и содержат page URL, evidence, current/expected state, risk, auto-fixability и verification method.

## Нормализованные Findings первой версии

- `oversized_image`;
- `missing_srcset`;
- `missing_sizes`;
- `missing_dimension_attributes`;
- `lcp_lazy_loaded`;
- `lcp_missing_fetchpriority`.

## Архитектурное решение

Image-core НЕ запускает браузер и НЕ делает сетевые запросы.

Pipeline:
`BROWSER/COLLECTOR → NORMALIZED IMAGE FACTS → image-core deterministic analysis → Findings`.

Причины:
- тестируемость;
- bounded context;
- отсутствие browser/network coupling в processing core;
- один и тот же analyzer можно использовать из MCP, расширения и CI;
- легче верифицировать evidence отдельно от интерпретации.

## Проверки

1. Diff isolation: PASS — изменён только `packages/image-core` + документация шага.
2. LCP evidence boundary: PASS по unit fixtures — hero hint не становится confirmed LCP.
3. Safety classification: PASS по fixtures — ambiguous `sizes` остаётся REVIEW.
4. DPR-aware oversize calculation покрыт тестом.

Полный runtime suite с Sharp остаётся зависим от установки native dependency и будет закрыт на technical gate 15/30. Pure page-analysis layer не использует Sharp.

## Следующий шаг

14/30 — реализовать Pareto MCP tools вокруг image-core: `analyze_page_images`, `optimize_image`, `optimize_page_images`, `generate_responsive_variants`, `compare_image_versions`, сохранив bounded schemas и отсутствие direct production write.
