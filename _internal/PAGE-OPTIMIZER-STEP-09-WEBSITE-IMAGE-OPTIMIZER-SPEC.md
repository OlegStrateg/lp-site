# LP-077 — Шаг 9/30: Product Spec — Website Image Optimizer MCP

Дата: 2026-09-09
Статус: DONE
Ветка: `research/LP-077-page-optimizer-base`
Issue: #182 / LP-077

## 1. Цель продукта

Создать первый самостоятельный коммерчески полезный модуль LayerPorter Page Optimizer: MCP для анализа и оптимизации изображений именно в контексте веб-страницы, а не очередной универсальный image converter.

Ключевая формула:
`PAGE CONTEXT → IMAGE FINDINGS → POLICY → OPTIMIZED VARIANTS → MARKUP RECOMMENDATION → BEFORE/AFTER EVIDENCE`.

## 2. Что уже является commodity

На рынке уже есть MCP/CLI для:
- optimize one image;
- convert JPEG/PNG/WebP/AVIF;
- resize/crop;
- batch optimization;
- local file / URL processing.

Примеры: `piephai/mcp-image-optimizer`, ShortPixel MCP, Cleanor MCP. Следовательно, LayerPorter не должен конкурировать количеством transform-функций.

## 3. Целевой пользователь

P0:
- разработчик / технический владелец сайта;
- AI coding agent / IDE agent;
- SEO/performance специалист, который хочет получить готовый безопасный план оптимизации изображений;
- будущий LayerPorter Page Optimizer как внутренний потребитель.

## 4. Основные пользовательские задачи

1. «Посмотри страницу и скажи, какие изображения реально тормозят её».
2. «Найди oversized изображения относительно rendered size».
3. «Пойми, какие изображения стоит конвертировать в WebP/AVIF, а какие нет».
4. «Сделай безопасные responsive variants».
5. «Оптимизируй hero/LCP изображение без ухудшения UX».
6. «Дай готовый srcset/sizes/width/height/fetchpriority/preload план».
7. «Покажи before/after: bytes, dimensions, format, expected page impact».

## 5. P0 MCP tools

### Tool 1 — `analyze_website_images`
Назначение: проанализировать изображения страницы и вернуть нормализованный список findings.

Вход:
- `page_url` — обязательный URL;
- optional `include_patterns` / `exclude_patterns`;
- optional `max_images`;
- optional `mode`: `quick | deep`.

Выход на каждое изображение:
- absolute URL;
- detected format;
- byte size where obtainable;
- intrinsic width/height;
- rendered width/height;
- device pixel ratio context where relevant;
- oversize ratio;
- lazy/loading state;
- `srcset` / `sizes` presence;
- width/height attributes;
- likely LCP/hero role if evidence exists;
- optimization opportunities;
- confidence;
- risk;
- estimated savings range;
- recommended next action.

Правило: не делать performance claims без evidence. Если роль LCP не подтверждена — маркировать как candidate/potential.

### Tool 2 — `optimize_image_for_website`
Назначение: оптимизировать конкретное изображение по контексту страницы.

Вход:
- image URL or trusted local input;
- current intrinsic dimensions;
- rendered target dimensions;
- desired policy: `auto | webp | avif | jpeg | png`;
- quality policy;
- no-upscale default true;
- preserve-alpha default true;
- preserve-orientation default true;
- optional role: `hero | content | thumbnail | decorative`.

Выход:
- original bytes/format/dimensions;
- optimized bytes/format/dimensions;
- savings bytes and percent;
- processing cost/time;
- quality policy used;
- guard results;
- artifact reference/path;
- recommendation whether to accept.

### Tool 3 — `generate_responsive_image_set`
Назначение: создать только реально полезные responsive variants.

Вход:
- source image;
- observed rendered widths / breakpoint hints;
- DPR policy;
- max variants;
- format policy.

Выход:
- variants list;
- width + bytes + format;
- proposed `srcset`;
- proposed `sizes`;
- recommended default `src`;
- total expected byte improvement.

Правило: не плодить варианты ради количества. Default max variants небольшой и выводится из реального page context.

### Tool 4 — `compare_image_versions`
Назначение: доказать, что новая версия выгоднее и не нарушает guardrails.

Выход:
- byte delta;
- dimension delta;
- format delta;
- alpha/orientation/colors checks;
- visual similarity/quality checks where available;
- processing cost;
- `ACCEPT | REVIEW | REJECT`.

### Tool 5 — `optimize_page_images`
Статус: P0.5 / orchestration tool, не отдельный большой runtime.

Назначение: последовательный orchestration нескольких SAFE image findings.

Ограничения:
- только allowlisted image fixes;
- bounded count;
- no direct site write;
- output = artifacts + proposed markup patch + evidence;
- применение на сайт — отдельный Safe Patch layer будущего Page Optimizer.

## 6. Что НЕ входит в MVP

- watermark;
- generic crop/editor;
- blur/sharpen filters;
- favicon generator;
- QR code;
- CDN;
- image hosting platform;
- arbitrary transform DSL;
- arbitrary filesystem write in hosted mode;
- autonomous HTML/production write;
- billing/accounts до доказанной usage value.

## 7. Processing engine

Основной engine: Sharp/libvips.

Политика форматов:
- WebP — безопасный baseline-кандидат;
- AVIF — только когда реальный byte gain оправдывает encoding cost и quality;
- PNG сохранять для alpha/lossless случаев, где conversion невыгоден;
- JPEG не заменять механически, если текущий результат уже эффективен;
- `never increase bytes` guard обязателен.

## 8. Hosted vs Local

### Local/stdio — обязателен
Преимущества:
- local files;
- zero upload privacy;
- удобен Claude Code/Codex/Cursor;
- проще начать распространение через npm.

### Hosted/Streamable HTTP — обязателен после локального ядра
Преимущества:
- zero-install;
- native connectors/directories;
- проще usage analytics;
- удобен для ChatGPT/Claude integrations.

Hosted mode не получает произвольного filesystem access.

## 9. Remote URL security contract

Обязательно:
- только http/https;
- DNS/IP validation;
- блок localhost/private/link-local/metadata/internal ranges;
- redirect revalidation;
- max redirects;
- response timeout;
- total job timeout;
- max Content-Length;
- streamed byte cap;
- decoded dimension/pixel cap;
- magic-byte/type validation;
- format allowlist;
- bounded concurrency;
- cleanup temp artifacts;
- output path controlled server-side;
- no arbitrary Sharp options passthrough.

## 10. Resource budgets

На runtime должны существовать жёсткие лимиты:
- max source bytes;
- max decoded pixels;
- max output variants;
- max images per page job;
- max concurrent encodes;
- per-format time budget;
- total request budget.

AVIF не должен блокировать очередь: отдельный concurrency/time policy.

## 11. AI boundary

LLM не решает низкоуровневую обработку.

Pipeline:
`PAGE FACTS → DETERMINISTIC RULES → POLICY → SHARP → GUARDS → RESULT`.

ИИ нужен только для:
- объяснения finding;
- выбора между несколькими безопасными стратегиями, если deterministic policy не даёт однозначного ответа;
- подготовки human-readable recommendation.

## 12. Finding schema для image-модуля

Минимальные поля:
- `finding_id`;
- `category`;
- `image_url`;
- `page_url`;
- `evidence`;
- `current_state`;
- `expected_state`;
- `impact`;
- `confidence`;
- `estimated_savings_bytes`;
- `risk`;
- `auto_fixability`;
- `recommended_tool`;
- `verification_method`.

## 13. Метрики продукта

P0:
- bytes saved per accepted optimization;
- percentage reduction;
- oversized-image findings resolved;
- responsive markup correctness;
- no-regression rate;
- rejected optimization rate;
- processing latency;
- tool-call success rate.

Главная системная метрика остаётся:
`Verified Improvement Rate`.

## 14. Definition of Done — первая коммерческая версия

DONE только если:
1. `analyze_website_images` стабильно извлекает page-aware image context;
2. `optimize_image_for_website` работает через Sharp/libvips и проходит guards;
3. responsive variants создаются без upscale и без мусорных вариантов;
4. WebP/AVIF policy подтверждена benchmark-набором;
5. remote URL security тесты PASS;
6. oversized/alpha/orientation/colors fixtures PASS;
7. never-increase-bytes guard PASS;
8. batch/bounded queue не падает под разумной нагрузкой;
9. local stdio package запускается через npm;
10. hosted transport имеет rate/resource limits;
11. tool schemas короткие, понятные и не дублируют друг друга;
12. есть before/after evidence;
13. README/docs объясняют page-aware differentiation;
14. нет прямой записи в production.

## 15. Pareto Gate

Собственное ядро пишем только для:
- page-context extraction;
- normalized findings;
- policy engine;
- responsive planning;
- security boundary;
- guards;
- orchestration/evidence.

Не пишем с нуля:
- codecs;
- resize/compression algorithms;
- browser engine;
- generic image editor;
- CDN.

## 16. Конкурентное отличие

Не:
`Optimize image URL`.

А:
`Understand how the image is actually used on the page → choose the safest high-value optimization → produce the right variants/markup → prove the result`.

## 17. Три обязательные проверки перед реализацией

1. Technical: Sharp/IPX/existing MCP API/security patterns.
2. Field: реальные image/CWV pain points и failure modes.
3. Product/Pareto: каждый tool должен вести к measurable page improvement.

## 18. Следующий шаг

10/30 — Session-2 Gate: свести distribution, baseline visibility, trust/entity и Product Spec в единый запусковой контракт; определить, готов ли проект переходить к implementation contour 11/30 без дополнительных исследований.
