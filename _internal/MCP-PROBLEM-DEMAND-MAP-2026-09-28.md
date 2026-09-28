# LayerPorter MCP — карта поискового спроса и владельцев интентов

Дата: 2026-09-28  
Задача: LP-118 / #294  
Ветка: `research/LP-118-mcp-distribution`  
Статус: RESEARCH / OWNER MAP  
Монетизация: HOLD до фактических данных бесплатного использования.

## 1. Зачем эта карта

Не создавать SEO-страницы по каждому ключу и не продвигать MCP только по слову `MCP`.

Цель:

`problem demand → правильный URL/инструмент → доказанный результат → MCP activation → repeat`.

Каждый самостоятельный интент получает одного владельца. Несколько словоформ не являются основанием для создания нескольких URL.

---

## 2. Как проверяли

### Проверка 1 — поисковые подсказки

Google Suggest, EN/US.

Канонический набор исследования:
- set id: `2562`;
- seeds: `compress website images`, `optimize website images`, `responsive images`, `lcp image optimization`;
- полный обход;
- сохранено более 1.3k фраз, последующий read-back вернул 1,722 фразы.

Важно: `score` и `hits` в Suggest — эвристика устойчивости/повторяемости подсказки, **не частотность**.

Из-за timeout/replay был создан частичный дубликат set `2563`. В анализе владельцем считается `2562`; 2563 не использовать как независимое доказательство спроса.

### Проверка 2 — фактический SERP / типы результатов

Проверены результаты для:
- website image compression;
- website image optimization;
- responsive image breakpoints;
- LCP image optimization.

Вывод:
- compression intent ожидает работающий инструмент, а не только статью;
- responsive-breakpoints intent имеет сильный специализированный tool precedent;
- LCP intent смешивает guide/tool intent и требует браузерных метрик, а не одной перекодировки изображений.

### Проверка 3 — текущая продуктовая правда LayerPorter

Проверены текущие Git/pages/image-core/MCP tools.

Публичный MCP умеет:
- анализировать caller-provided page/image facts;
- оптимизировать один файл;
- генерировать запрошенные responsive variants без upscale;
- сравнивать версии;
- оптимизировать bounded batch;
- анализировать static HTML URL;
- оптимизировать bounded static URL images и возвращать before/after bytes.

Публичный MCP **не умеет**:
- измерять реальный browser LCP;
- определять browser-selected `currentSrc`;
- видеть CSS background images в URL fast mode;
- исполнять JavaScript lazy-loading;
- автоматически вычислять оптимальные responsive breakpoints;
- генерировать полноценный готовый `srcset`/HTML как отдельный public tool;
- писать исправления обратно на production.

---

## 3. Сигналы Google Suggest

Ниже — не volume, а сигнал языка спроса.

### A. Website image compression

Сильные формулировки:
- `compress image to web size` — hits 11;
- `compress images for website online` — hits 6;
- `compress images for website speed` — hits 5;
- `how to compress images for website` — hits 6;
- `compress images for website` — hits 3;
- `compress website images online free`;
- `compress website images without losing quality`;
- `compress website images chrome extension`.

Интент: **сделать файл меньше для сайта и получить готовый результат**.

### B. Website image optimization

Сильные формулировки:
- `how to optimize images for web` — hits 9;
- `optimize images for website without losing quality` — hits 5;
- `optimize images for website online` — hits 6;
- `optimize website images for seo`;
- `how to optimize images for website` — hits 5;
- `optimize website images best practices`;
- `optimize website images with ai`;
- `optimize website images performance`.

Интент шире compression: формат + размер + dimensions + responsive delivery + performance guidance.

### C. Responsive images

Сильные формулировки:
- `responsive image size` — hits 40;
- `responsive images css`;
- `responsive images html`;
- `responsive image breakpoints generator` — hits 4;
- `responsive images srcset`;
- `responsive images best practices`;
- `responsive images generator`;
- `responsive images for website`.

Интент неоднородный:
1. объяснение HTML/CSS/srcset;
2. генерация вариантов;
3. вычисление breakpoints;
4. framework-specific запросы.

### D. LCP image optimization

Сигналы:
- `lcp image optimization tool`;
- `lcp image optimization software`;
- `lcp image optimization guidelines`;
- `lcp image optimization how to`;
- `lcp image optimization best practices`.

Интент есть, но существенно уже и более информационный. Нельзя трактовать наличие подсказок как доказательство большого commercial volume.

---

## 4. Карта владельцев интентов

| Кластер | Поисковая задача | Владелец сейчас | Действие | Статус |
|---|---|---|---|---|
| Website image optimizer MCP | автоматизировать оптимизацию через AI-agent | `/mcp/website-image-optimizer/` | усилить outcome/install после VERIFIED 0.1.1 | P0 |
| MCP documentation | установить/понять tools/limits | `/docs/mcp/website-image-optimizer/` | техническая документация, не SEO-клон landing | P0 |
| Compress images for website | сделать изображения сайта легче | нового рабочего web tool пока нет | построить на shared image-core; один owner | P1 |
| Optimize images for website | улучшить web delivery/bytes/dimensions/formats | будущий website image optimizer/compressor workflow | не создавать отдельный слабый клон compressor | P1 |
| Convert image to WebP | изменить формат файла | существующий Picture Converter / converters | сохранить текущего владельца, добавить переход в website optimization | KEEP |
| Responsive image generator | получить несколько размеров изображения | MCP умеет variants, web UI нет | кандидат на web tool через shared core | P1/P2 |
| Responsive breakpoints generator | автоматически подобрать оптимальные widths | capability отсутствует | не создавать tool page до алгоритма | HOLD |
| srcset generator | получить готовый srcset/markup | public capability неполная | guide/supporting intent; tool только после реализации | HOLD |
| LCP image optimization | улучшить реальный LCP | static MCP не измеряет LCP | guide сейчас; tool после browser audit runtime | HOLD |
| Core Web Vitals images | диагностировать image-related CWV issues | текущий URL mode недостаточен для полного browser truth | supporting guide → будущий Page Audit | HOLD |
| WordPress/Shopify-specific optimization | оптимизировать конкретную CMS | специальных интеграций нет | не создавать платформенные landing без capability/evidence | HOLD |

---

## 5. Что строить первым

### P0. MCP owner page после VERIFIED 0.1.1

Один сильный URL:

`/mcp/website-image-optimizer/`

Первый экран отвечает на задачу, а не объясняет протокол:

**Optimize website images from your AI agent**

Доказательство:
`URL/image → analyze → optimize → verified before/after bytes → downloadable temporary resource`.

На странице:
- exact install;
- verified clients;
- 3–5 готовых outcome prompts;
- реальные limitations;
- 7 tools;
- security boundary;
- before/after из воспроизводимого теста;
- CTA на документацию.

Не создавать отдельные страницы:
- image optimizer MCP;
- website image MCP;
- WebP MCP;
- image compression MCP.

Это словоформы одного product intent.

### P1. Первый problem-first web tool

Рабочая задача:

**Compress / optimize images for website**

Продукт должен реально:
- принять изображение;
- показать original bytes;
- предложить безопасный web-oriented output;
- не увеличивать файл;
- поддержать WebP и при явном выборе AVIF output;
- при необходимости resize без upscale;
- показать output bytes и savings;
- скачать результат.

Технически строится на общем image-core.

До implementation отдельный URL не публиковать.

#### URL-решение

Не фиксировать окончательный slug до Sprint B2, потому что уже существует продуктовая очередь `Compress + Convert`.

Предпочтительная архитектура:
- один реальный editor/runtime;
- один основной tool owner;
- поисковые landing создаются только при доказанном самостоятельном intent и отличимом workflow.

Не создавать одновременно `/image-compressor/`, `/compress-images/`, `/compress-images-for-website/`, `/website-image-optimizer/` как четыре почти одинаковых инструмента.

### P1/P2. Responsive image generator

Capability частично уже существует в shared core/MCP: несколько запрошенных widths, max 6, no upscale.

Минимальный web workflow:
`upload → widths/presets → generated variants → size evidence → download`.

До отдельного breakpoint algorithm нельзя называть его **responsive breakpoint generator**.

### P2. Supporting content

Один сильный guide cluster вокруг web image optimization:

- how to optimize images for web;
- image compression vs resize vs format conversion;
- responsive images / srcset basics;
- LCP image optimization: что реально влияет на LCP;
- WebP vs AVIF for websites.

Guide должен вести в работающий tool/MCP, а не существовать как SEO-текстовый остров.

---

## 6. Что сейчас НЕ строить

### Не делать LCP Optimizer tool

Причина:
реальный LCP — браузерная метрика. Current URL fast mode не знает:
- какой элемент стал LCP;
- browser-selected currentSrc;
- rendered dimensions;
- load delay/render delay;
- влияние priority/discovery.

Оптимизация bytes может помочь, но не доказывает исправление LCP.

Правильный момент: после Page Audit Extension / browser-aware runtime.

### Не делать Responsive Breakpoints Generator

Причина:
текущий MCP принимает widths от caller, но не вычисляет оптимальные breakpoints.

Поисковый рынок уже содержит специализированные breakpoint tools. Страница с ручным вводом widths под этим названием будет product mismatch.

### Не делать Srcset Generator как отдельный инструмент

Пока public tool может генерировать variants, но не имеет отдельного end-to-end markup contract.

Сначала:
`variants → URLs/files → sizes → verified markup output`.

### Не делать CMS-specific SEO pages

Не создавать WordPress/Shopify/Webflow и т.п., пока нет:
- реальной интеграции;
- специфического workflow;
- самостоятельного evidence.

---

## 7. Внутренние переходы

### Existing format intent

`WebP converter / picture converter`
→ результат конвертации
→ contextual next step:
**Optimize this image for website delivery**

### Future problem tool

`Compress/optimize images for website`
→ before/after result
→ next step:
**Do this repeatedly from Claude/Cursor with LayerPorter MCP**

### MCP landing

`Website Image Optimizer MCP`
→ install/connect
→ first success
→ second workflow

Никакой account/payment wall на этом этапе.

---

## 8. AI discovery

После VERIFIED 0.1.1 описания tools проверяются как machine-facing conversion surface.

Формула:

`ACTION + OBJECT + WHEN TO USE + LIMITATION + OUTPUT`

Пример для `optimize_url_images`:

> Fetch a public HTTP(S) page, discover a bounded set of static raster image sources, recompress eligible JPEG/PNG/WebP inputs at original dimensions, verify byte savings, and return accepted images as temporary MCP resources. Use for fast static-page image optimization when browser-rendered currentSrc, LCP, CSS backgrounds, or JavaScript lazy content are not required. Does not write to the website.

Требования:
- не раздувать schemas/descriptions;
- не добавлять ложные keywords;
- ограничение должно быть понятно модели;
- названия tools не менять без compatibility review.

---

## 9. Измерение бесплатного эксперимента

### До публикации

Baseline:
- public npm = 0.1.0;
- npm weekly downloads = 0 на момент внешней проверки;
- MCP landing: 0 Search Console rows за проверенные последние 90 дней;
- payment/account funnel отсутствует.

### После VERIFIED 0.1.1

Смотрим:
1. npm download trend;
2. MCP landing impressions/clicks/query mix;
3. GitHub referral/stars/issues только как secondary signals;
4. Registry/directory referrals после отдельной публикации;
5. install friction/errors из открытых issue/community feedback;
6. first-success и repeat — только через явно спроектированный privacy-safe measurement, если будет принято отдельное решение.

Не внедрять скрытую usage telemetry в локальный stdio package.

---

## 10. Pareto backlog

### Сейчас

1. сохранить release candidate 0.1.1 неизменным;
2. разблокировать штатный npm release административным release switch;
3. external read-back + clean public E2E;
4. привести npm/GitHub/site truth к фактическому 0.1.1 отдельной post-release задачей;
5. затем review tool descriptions и activation copy;
6. затем решить Official MCP Registry;
7. параллельно проектировать первый реальный website compression/optimization web tool на shared core.

### После появления данных

SCALE только то, что улучшает:
`find → try → first success → repeat`.

Монетизация рассматривается после evidence повторяемого использования.
