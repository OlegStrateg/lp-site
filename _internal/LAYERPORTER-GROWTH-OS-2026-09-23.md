# LayerPorter Growth OS — каноническая стратегия 11/10

Дата фиксации: 2026-09-23  
Статус: **CANONICAL**  
Issue: #290 / LP-117  
Базовый production HEAD на момент фиксации: `31f3e09e6f69391580e4267f444eb51410002948`

Этот документ определяет общую стратегию LayerPorter по SEO, Web Tools, расширениям, MCP, будущим AI/paid-функциям, локализации, CRO, UX, аналитике и техническому переиспользованию.  
`_internal/LAYERPORTER-ROADMAP.md` является execution-roadmap и не должна противоречить этому документу.

---

## 1. Главная цель LayerPorter

LayerPorter строится не как «сайт конвертеров» и не как набор случайных бесплатных утилит.

Целевая система:

```
Google / AI Search
        ↓
точная страница под самостоятельный intent
        ↓
реально работающий бесплатный инструмент
        ↓
успешный результат за минимальное время
        ↓
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ next web tool│ Chrome ext   │ MCP / agent  │ future AI    │
└──────────────┴──────────────┴──────────────┴──────────────┘
        ↓
repeat usage / branded demand / account later
        ↓
paid AI / credits / subscription / API
```

На текущем этапе основная коммерческая задача бесплатного трафика — **превратить успешное использование сайта в установку релевантного расширения или повторное использование LayerPorter**.

Регистрация до появления платной/сохраняемой ценности не вводится как самоцель.

---

## 2. Четыре контура продукта

### Контур A — SEO / Web Tools

Назначение:
- получать органический трафик по точным пользовательским задачам;
- сразу решать задачу;
- создавать доверие;
- вести к следующему релевантному действию.

### Контур B — Extensions

Назначение:
- забирать пользователя в регулярный browser workflow;
- увеличивать repeat usage;
- возвращать пользователя в web workspace при сложной обработке;
- создавать двусторонний growth loop: Website ↔ Extension.

### Контур C — MCP / Agents

Назначение:
- сделать те же core capabilities доступными AI-агентам;
- давать не только одиночные tools, но и composable workflows;
- не создавать отдельную MCP-реализацию функции, если уже существует core engine.

### Контур D — AI / Paid

Назначение:
- монетизировать дорогую и ценную обработку;
- вводить регистрацию только после явной ценности;
- использовать бесплатные SEO-tools как верх будущей paid funnel.

---

## 3. Архитектурный принцип: одна capability → много каналов

Любая сильная функция по возможности проектируется так:

```
Core capability
├── Web UI
├── SEO landing
├── Extension action / handoff
├── MCP tool
└── future API / paid workflow
```

Примеры:

```
resize_image()
├── /tools/resize-image/
├── Image Workspace
├── extension handoff
└── MCP resize_image
```

```
image_to_layers()
├── /ai/image-to-layers/
├── AI Workspace
├── MCP image_to_layers
├── export PSD/Figma/Canva
└── credits / paid
```

Запрещено дублировать upload/state/export/runtime без необходимости.

---

## 4. Search architecture != Navigation architecture

Это фундаментальный принцип.

SEO может требовать десятки точных URL.  
Пользовательский интерфейс не должен показывать десятки равнозначных карточек.

### Search architecture

Отдельный URL получает **самостоятельный пользовательский intent**, например:

- `/tools/merge-pdf/`
- `/tools/crop-image/`
- `/tools/resize-image/`
- `/tools/meme-generator/`
- `/convert/webp-to-jpg/`
- `/convert/pdf-to-jpg/`

Вариации одного намерения не получают отдельные URL только ради exact match.

Пример:

`jpg to pdf`, `convert jpg to pdf`, `jpeg to pdf`, `turn jpg into pdf` → один сильный owner URL.

### Navigation architecture

Для человека Web Tools должен группироваться в несколько понятных задач:

```
Web Tools
├── Images
├── PDF
├── Convert
├── Download
├── Media
└── AI
```

Узкие conversion routes могут быть доступны через compact FROM → TO chooser, related tools, search и category expansion, но не обязаны занимать отдельную большую карточку.

---

## 5. SEO-стратегия

### Главный принцип

Не «точное вхождение любой ценой», а:

**точный самостоятельный intent + точная функция + сильная продуктовая страница.**

Title/H1/body должны использовать реальные поисковые формулировки естественно, но количество страниц определяется различием задач, а не количеством ключевых вариаций.

### Что обязана делать каждая SEO-tool page

```
search intent
→ понятный title / H1
→ инструмент сразу на первом экране
→ минимальный time-to-value
→ реальный успешный результат
→ download / export
→ следующий релевантный tool
→ contextual extension CTA
→ только полезное supporting content
```

SEO-текстовая прокладка перед инструментом запрещена.

### AI Search

Приоритет увеличивается у action queries, которые нельзя полноценно закрыть текстовым AI-ответом:

- crop image;
- merge pdf;
- resize image;
- remove background;
- OCR;
- image to layers;
- convert X to Y.

Информационные запросы используются как supporting authority/internal-link layer, но не должны вытеснять action tools из продуктового фокуса.

---

## 6. Локализация

Массовый «перевести всё на 50 языков» не является стратегией.

Каждая локализация проходит Locale Opportunity Gate:

```
Search demand
× SERP opportunity
× current impressions
× user value
× extension fit
× future paid value
÷ localization + QA cost
```

Полноценная locale означает локализацию:
- Title / Description / H1;
- tool UI;
- buttons / errors / statuses;
- supporting copy;
- FAQ;
- related tools;
- internal links;
- локальных поисковых формулировок;
- hreflang/canonical.

Простой машинный перевод EN-копии без локального поискового смысла не считается READY.

---

## 7. CRO-модель

### Текущая главная бизнес-метрика

```
SEO visit
→ tool success
→ extension CTA
→ Chrome Web Store
→ install
```

До появления paid AI регистрация не является основной целью.

### Правильная последовательность

```
Google
→ free tool
→ successful result
→ trust
→ “делаете это регулярно?”
→ релевантное расширение
```

Нельзя заставлять пользователя устанавливать расширение до решения поисковой задачи, если это ухудшает task completion.

### Contextual Extension CTA

CTA определяется контекстом:

- WebP → JPG → Picture Converter;
- Pinterest URL downloader → Pinterest Downloader;
- Crop/Resize → handoff/extension только если есть реальная польза;
- нерелевантный CTA запрещён.

---

## 8. UX / Information Architecture

Пользователь не должен видеть внутреннюю SEO-сетку сайта.

Основные требования:
- минимальное число категорий;
- понятный поиск инструмента;
- единая логика empty/active/success states;
- один Workspace для связанной обработки;
- сохранение текущего файла между совместимыми tools;
- следующий шаг очевиден;
- mobile — полноценный сценарий, а не урезанная копия desktop.

Целевая структура Web Tools:

```
Images
  Crop · Resize · Compress · Meme · Rotate · More

PDF
  Merge · Split · Convert · Compress · More

Convert
  [FROM] → [TO]

Download
  Pinterest URL · другие подтверждённые URL workflows

Media
  Extract Audio · Mute · future media tools

AI
  OCR · Remove Background · Upscale · Image to Layers · ...
```

---

## 9. MCP-стратегия

MCP — не отдельный продуктовый остров.

Для каждой capability заранее проверяется MCP-fit.

Базовые контракты:

```
resize_image(image, width, height, options)
crop_image(image, region, ratio)
convert_image(image, format, options)
merge_pdf(files, order)
split_pdf(file, ranges)
extract_audio(video, format)
ocr(file, options)
remove_background(image, options)
image_to_layers(image, options)
```

Следующий уровень — workflows:

```
download_from_url
→ crop
→ remove_background
→ upscale
→ export_png
```

Core engine должен быть один; Web/Extension/MCP/API — клиенты.

---

## 10. Future AI / Paid layer

Бесплатные tools выбираются в том числе по способности собирать аудиторию для будущих платных функций.

### Free / acquisition layer

- Crop;
- Resize;
- Convert;
- Merge/Split PDF;
- Basic OCR;
- basic image processing;
- download workflows.

### Paid-value candidates

- OCR Pro + layout/structure;
- Remove Object;
- Generative Expand;
- Upscale Pro;
- Image → Layers;
- Image → Prompt;
- Reference → Image;
- editable PSD/Figma/Canva reconstruction.

Регистрация вводится в момент, когда пользователь уже увидел ценность и хочет:
- более дорогой inference;
- сохранение проекта;
- batch;
- history;
- high-resolution result;
- advanced export.

---

## 11. LayerPorter Opportunity Score

Новые функции не выбираются по вкусу команды.

Базовая модель:

```
Search Demand
× Ranking Opportunity
× User Value
× Tool Success Probability
× Extension Conversion
× Repeat Usage
× MCP Reuse
× Future Paid Adjacency
× Strategic Fit
────────────────────────────────
Development Cost
× Maintenance Cost
× SEO Risk
× Operational Risk
```

Результат:
- P0 — немедленно;
- P1 — следующий спринт;
- P2 — backlog;
- P3 — исследование;
- DROP — не делать.

Весовые коэффициенты нельзя придумывать навсегда: после накопления данных они калибруются по реальным результатам.

---

## 12. Tool Quality Gate

Ни один инструмент не считается законченным только потому, что «работает».

Обязательный gate:

### Search
- один owner intent;
- SERP проверен;
- Title/H1 соответствует задаче;
- нет каннибализации;
- canonical/hreflang/sitemap корректны.

### Product
- функция реально решает обещанную задачу;
- ограничения честно показаны;
- результат можно получить без ненужных шагов.

### CRO
- first action очевиден;
- success → download/export;
- contextual next step;
- contextual extension CTA.

### UX
- понятен без инструкции;
- empty/loading/error/success;
- keyboard/touch;
- mobile.

### UI
- соответствует общей visual system;
- SEO-структура не превращается в визуальный мусор;
- нет типового AI-slop.

### Performance
- тяжёлый runtime ленивый;
- Core Web Vitals не ухудшены без причины;
- общий bundle не раздувается.

### Analytics
- tool_view;
- upload_start;
- tool_success;
- tool_error;
- download;
- related_tool_click;
- extension_cta_view;
- extension_cta_click;
- extension_store_open.

### Architecture
- shared core переиспользован;
- MCP-fit проверен;
- нет ненужного дублирования.

### Verification
- static/build;
- real browser smoke;
- screenshot/visual review;
- production smoke.

---

## 13. Обязательный multi-specialist review

До существенного стратегического или продуктового решения сначала создаётся draft.

Затем каждый специалист независимо проверяет его по своим skills.

### Главный стратег
Skills:
- product strategy;
- product marketing;
- customer research;
- positioning;
- growth loops;
- anti-overengineering.

Выход:
- что поддерживает;
- что противоречит общей модели;
- free/paid sequencing;
- стратегический приоритет.

### SEO
Skills:
- keyword research;
- SERP analysis;
- technical SEO;
- programmatic SEO;
- content gaps;
- internal linking;
- site architecture.

Выход:
- intent gaps;
- owner URLs;
- pages to merge;
- cannibalization;
- localization opportunities;
- internal-link graph;
- top SEO opportunities.

### CRO
Skills:
- funnel audit;
- conversion optimization;
- A/B testing;
- marketing psychology;
- analytics.

Выход:
- funnel leaks;
- CTA map;
- extension conversion mechanics;
- experiment backlog.

### UX / IA
Skills:
- Nielsen heuristics;
- user journey;
- prototyping;
- usability;
- information architecture.

Выход:
- task taxonomy;
- navigation;
- friction;
- time-to-value;
- mobile flow.

### UI / Design
Skills:
- design review;
- design system;
- responsive;
- accessibility;
- anti-slop / taste audit.

Выход:
- hierarchy;
- compact representation;
- interaction states;
- visual consistency.

### Marketing
Skills:
- positioning;
- acquisition;
- lifecycle;
- retention;
- product marketing.

Выход:
- value proposition;
- growth loop;
- extension/site relationship;
- brand implications.

### Analytics
Skills:
- event taxonomy;
- funnel/cohort;
- attribution;
- experimentation.

Выход:
- KPI tree;
- event requirements;
- dashboards;
- thresholds.

### Technical Architecture
Skills:
- shared core;
- performance;
- dependency boundaries;
- anti-duplication.

Выход:
- reuse map;
- architecture risk;
- build/performance cost.

### MCP Architect
Skills:
- MCP contracts;
- composability;
- agent workflows;
- API semantics.

Выход:
- MCP-fit;
- tool contract;
- workflow reuse.

### AI Product / Monetization
Skills:
- inference economics;
- freemium;
- value metric;
- credits/subscription;
- model routing.

Выход:
- free/paid boundary;
- cost risk;
- future revenue adjacency.

### Red Team
Обязан ответить:
- почему стратегия может провалиться;
- что переоценено;
- что недооценено;
- где SEO создаст мусор;
- где UX убьёт discoverability;
- где архитектура не масштабируется;
- где отсутствует доказательство спроса.

---

## 14. Правило разрешения конфликтов

Решение не принимается голосованием.

Пример:

SEO хочет 100 точных URL.  
UX не хочет 100 карточек.  
Решение: 100 URL могут существовать в search architecture, но navigation показывает 5–7 категорий и compact selector.

Главный стратег собирает новую версию после замечаний всех ролей и явно фиксирует:
- что принято;
- что отклонено;
- почему;
- какие риски остаются;
- что требует эксперимента.

---

## 15. Три обязательные проверки до действия

### Проверка A — данные
- GSC;
- analytics;
- Semrush/ASO;
- production;
- Git.

### Проверка B — рынок
- SERP;
- конкуренты;
- Google guidance/updates;
- GitHub/open source;
- форумы/Reddit при необходимости.

### Проверка C — пользователь
- real browser flow;
- task completion;
- time-to-value;
- mobile;
- visual review.

После этого создаётся checklist. Только затем реализация.

---

## 16. Обязательные стратегические артефакты

### 16.1 Master Product & SEO Map

Для каждой capability:

`Function | exists | current location | core | web URL | intent | demand | GSC | competition | locales | UX | CRO | extension fit | MCP fit | paid AI fit | implementation cost | status | priority | next action`

### 16.2 Opportunity Matrix

Все новые функции ранжируются по Opportunity Score и распределяются P0/P1/P2/P3/DROP.

### 16.3 12-Month Growth Roadmap

Должна связывать:
- technical SEO;
- текущие money pages;
- Web Tools hub;
- free tools;
- localization;
- extension funnel;
- MCP;
- AI paid layer.

---

## 17. Ближайшая последовательность

### P0 — аудит и фундамент

1. Полная инвентаризация функций сайта, расширений и существующих core-модулей.
2. Полная карта публичных URL.
3. Search Console + SERP + Semrush intent map.
4. Проверка www/non-www, canonical, hreflang, sitemap, indexing signals.
5. Master Product & SEO Map.
6. Единая analytics funnel.
7. Contextual Extension CTA architecture.

### P1 — привести существующие инструменты к Quality Gate

Порядок определяется реальными данными, не историей создания.

Каждый инструмент проходит:
`SEO → functionality → UX → CRO → performance → analytics → extension CTA → localization readiness → MCP readiness → browser smoke`.

### P2 — закрыть функциональные пробелы

Кандидаты для оценки:
- Merge PDF;
- Split PDF;
- Compress Image;
- Rotate/Flip;
- PDF ↔ Images;
- Pinterest by URL;
- другие функции уже существующих расширений;
- media functions.

Ничего из этого не считается автоматически P0 без Opportunity Score.

### P3 — Web Tools Hub

Сделать компактный продуктовый каталог по задачам.  
Не выводить внутреннюю SEO-сетку как набор одинаковых карточек.

### P4 — локализации

Локализовать только прошедшие Quality Gate функции по Locale Opportunity.

### P5 — MCP

Выдавать MCP contracts общим core capabilities и собирать workflow-композиции.

### P6 — AI / Paid

Подключать дорогую AI-ценность после того, как free acquisition + retention loop доказан данными.

---

## 18. Метрики по стадиям

### Сейчас
Главная метрика:
`organic visit → successful tool use → extension store → install`.

### Следующая стадия
`organic visit → tool success → repeat usage / extension / MCP adoption`.

### Paid стадия
`organic/free user → paid AI action → account → revenue`.

### Глобальная
Lifetime value и повторное использование, создаваемые одним поисковым входом.

---

## 19. Зафиксированный baseline данных

На момент стратегической фиксации, по Search Console за последние 90 дней:

- impressions: около **3 394**;
- clicks: **11**;
- CTR: около **0,32%**;
- average position: около **58,6**.

Это не целевой KPI, а baseline для будущего сравнения.

Уже видимые поисковые сигналы:
- `/formats/psd/`;
- `/convert/png-to-psd/`;
- `/guides/export-from-ai-builders/`;
- `/convert/psd-to-png/`;
- другие converter/format страницы.

Исторические `www.layerporter.com` строки в GSC требуют технической проверки, но сами по себе не считаются доказательством текущей ошибки.

---

## 20. Что запрещено

- плодить URL под синонимы одного intent;
- массово переводить слабые страницы;
- считать перевод READY без локального SEO/UX QA;
- превращать Web Tools Hub в каталог SEO-ключей;
- заставлять устанавливать расширение до выдачи базовой ценности;
- создавать новый runtime при существующем общем ядре;
- строить MCP как отдельную дублирующую систему;
- добавлять AI-функции только потому, что они «модные»;
- придумывать веса Opportunity Score без последующей калибровки данными;
- объявлять стратегию/инструмент VERIFIED без фактической проверки.

---

## 21. Определение уровня 11/10

Стратегия считается 11/10 не потому, что она большая.

Она должна обеспечивать цикл:

```
data
→ draft
→ specialist reviews
→ red team
→ conflict resolution
→ opportunity score
→ implementation
→ browser/SEO/analytics verification
→ real-world data
→ next iteration
```

LayerPorter должен развиваться как единая система, где SEO, UX, расширения, MCP и будущая монетизация усиливают друг друга, а не конкурируют за архитектуру.
