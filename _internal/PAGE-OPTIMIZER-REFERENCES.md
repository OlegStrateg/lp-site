# LayerPorter Page Optimizer — база референсов

Статус: RESEARCH BASE / LP-077 / 2026-09-09

## 1. Принцип отбора

Каждый внешний референс получает один из статусов:

- KEEP — зрелый компонент/паттерн, который допустимо брать за основу.
- ADAPT — сильная база, но нужна тонкая адаптация под LayerPorter.
- STUDY — полезен как архитектурный/продуктовый референс, но не как зависимость.
- REJECT — не использовать как основу.

Перед добавлением зависимости отдельно проверить: license, latest commits/releases, critical issues, security history, browser/runtime compatibility, bundle/runtime cost, commercial-use restrictions.

## 2. Image Optimization MCP

### Sharp / libvips — KEEP
Источник: https://github.com/lovell/sharp
Роль: серверная обработка JPEG/PNG/WebP/AVIF, resize, metadata, alpha, quality.
Решение: не писать собственные кодеки и pipeline resize/compression.

### Squoosh — STUDY / selective reuse
Источник: https://github.com/GoogleChromeLabs/squoosh
Роль: референс локальной/WASM обработки и UX сравнения качества.
Решение: использовать идеи/кодеки только после отдельной проверки поддержки и размера; не тащить весь продукт.

### piephai/mcp-image-optimizer — STUDY
Источник: https://github.com/piephai/mcp-image-optimizer
Что уже реализовано: URL/local image, batch, Sharp transforms, WebP/AVIF, resize/crop/LQIP.
Вывод: generic image MCP уже commodity. Наше отличие должно быть page-context: rendered dimensions, LCP role, responsive variants, srcset/sizes, before/after page impact.

## 3. Page Audit

### Lighthouse / Lighthouse CI — KEEP
Источники:
- https://github.com/GoogleChrome/lighthouse
- https://github.com/GoogleChrome/lighthouse-ci
Роль: лабораторный performance/accessibility/SEO/best-practices baseline, повторяемые CI-регрессии.
Ограничение: Lighthouse score не использовать как бизнес-KPI или прямой ranking factor.

### web-vitals — KEEP
Источник: https://github.com/GoogleChrome/web-vitals
Роль: field-like runtime instrumentation LCP/CLS/INP и attribution.
Решение: отделять lab Lighthouse от реальных пользовательских метрик.

### axe-core — KEEP
Источник: https://github.com/dequelabs/axe-core
Роль: deterministic accessibility checks.
Ограничение: автоматизация не покрывает все WCAG проблемы; uncertain/manual checks не маркировать как PASS.

### Playwright — KEEP
Источник: https://github.com/microsoft/playwright
Роль: функциональные smoke tests, screenshots, visual regression, multi-page verification.

### lighthouse-mcp-server — STUDY
Источник: https://github.com/danielsogl/lighthouse-mcp-server
Полезный паттерн: URL как простой основной input, агент сам выбирает нужный audit tool. Не выставлять пользователю/агенту десятки лишних knobs.
Из Issues: публичный URL-in → score-out demo снижает порог первого использования; учитывать в нашей MCP landing/demo.

### WebAuditMCP — STUDY
Источник: https://github.com/iberi22/WebAuditMCP
Полезно: единая taxonomy performance/security/accessibility/visual checks.
Не копировать количество checks; LayerPorter должен выигрывать приоритизацией и verified fixes.

### Silo / SEO Auditor — STUDY
Источники:
- https://github.com/nauvalazhar/silo
- https://github.com/plainsignal/seo-auditor
Полезно: Side Panel и формат «что не так → почему → как исправить»; широкий deterministic SEO checklist.
Вывод: checklist сам по себе не moat.

## 4. Safe AI Fixes

### Aider Git workflow — ADAPT
Источник: https://github.com/Aider-AI/aider
Паттерны:
- dirty state не смешивать с AI changes;
- отдельные commits;
- diff review;
- undo/rollback;
- Git как журнал действий.
Это обязательная философия Safe Fix Engine.

### SafeAgent — STUDY / ADAPT concepts
Источник: https://github.com/parthamehta123/safeagent
Паттерны: sandbox → hash grounding → real files only → policy validation → diff safety → AST/tests → audit trail → PR.
Вывод: не обязательно брать код; архитектурный контрольный список очень релевантен.

### improve-codebase skill — STUDY
Источник: https://github.com/tomzx/agents/blob/main/skills/improve-codebase/SKILL.md
Сильные правила: never default branch, low-risk auto only, verification mandatory, revert failed change, bounded change budget, one concern per commit.

## 5. Agentic execution

### Stagehand — STUDY / selective ADAPT
Источник: https://github.com/browserbase/stagehand
Ключевой принцип: deterministic code там, где действие известно; AI только там, где вариативность действительно требует reasoning.
Использовать как правило архитектуры агента.

### Browser Use — STUDY
Источник: https://github.com/browser-use/browser-use
Роль: референс browser-agent orchestration.
Решение: не тащить целиком в Pareto MVP; нужен маленький bounded agent loop поверх наших tools.

## 6. AI-agent readiness / discoverability

### Agent Lighthouse — STUDY
Источник: https://github.com/ForkPoint/agent-lighthouse
Проверяет обнаруживаемость/parse/citation/action readiness для ChatGPT/Claude/Perplexity/MCP clients.
Полезно как референс будущего AI-readiness audit, но claims по ranking проверять отдельно.

### AgentReady — STUDY
Источник: https://github.com/erold90/AgentReady
Проверяет WebMCP, well-known agent/MCP discovery, OpenAPI и agent simulation.
Важно: часть discovery conventions может быть emerging/de-facto, а не официальным ranking mechanism; каждую включать после верификации стандарта.

## 7. SEO + AI Search reference stack

### iannuttall/seo skill — ADAPT METHODOLOGY
Источник: https://github.com/iannuttall/seo
Сильная идея: один router skill, который сначала выбирает структурированный report и грузит только нужную глубину, вместо отправки гигантского crawl dump в LLM.
Это прямо подходит для нашей token/context архитектуры Findings → targeted evidence → AI reasoning.

### Current field intelligence — HYPOTHESIS, NOT FACT
Источники для постоянного наблюдения:
- Reddit r/TechSEO, r/bigseo, r/SEO и узкие AI SEO сообщества;
- BlackHatWorld;
- GitHub Issues MCP Registry / Lighthouse / Chrome Extensions;
- реальные case studies с raw data;
- наши GSC/analytics/AI Search Observatory.

Наблюдаемый паттерн 2026: AI engines имеют слабое совпадение между наборами цитируемых сайтов; поэтому AI visibility измеряется отдельно по движкам и повторным prompts. Не превращать одиночный Reddit case в правило.

## 8. REJECT / anti-patterns

- собственный Lighthouse clone;
- собственный image codec;
- собственный accessibility ruleset вместо axe-core;
- 100+ MCP tools ради количества;
- полный raw crawl/Lighthouse JSON прямо в LLM;
- autonomous production writes без snapshot/diff/test/rollback;
- «исправлено» без before/after verification;
- llms.txt/schema/MCP как якобы гарантированный ranking factor;
- каталог ради ссылки без проверки качества/индексации/спама.

## 9. Критерий конкурентного преимущества

LayerPorter выигрывает не количеством audits, а связкой:

`DETECT → PRIORITIZE → PROVE → SAFE FIX → VERIFY → ROLLBACK`.

Каждый следующий референс сравнивать именно по этой цепочке.

---

# 10. Шаг 2/30 — углублённый аудит Website Image Optimization MCP

Дата: 2026-09-09
Статус: DONE

## 10.1 Sharp / libvips — KEEP, основной processing engine

Факты на момент проверки:
- `lovell/sharp` — ~32.6k stars, ~1.4k forks;
- активный проект: push 2026-09-07;
- Apache-2.0;
- JPEG/PNG/WebP/AVIF/TIFF, resize, metadata, alpha, ICC/EXIF pipeline;
- libvips под капотом.

Решение:
- использовать как основной серверный image engine;
- не писать собственный resize/compression/format pipeline;
- завернуть в LayerPorter adapter с собственными guards и policy.

Критические ограничения из реальных Issues:
1. AVIF encoding может быть существенно тяжелее WebP по CPU/RAM; нельзя по умолчанию обещать «AVIF всегда лучше».
2. У Sharp timeout/abort не гарантирован на самой encode-фазе; внешнее ограничение времени не всегда прекращает расход CPU.
3. AVIF quality/effort требует собственного benchmark; универсальный quality=50 не считать правильным для любого контента.

Архитектурное следствие:
- bounded queue;
- input pixel/dimension limits;
- memory/concurrency limits;
- per-format time budget;
- WebP как быстрый безопасный baseline, AVIF — только когда expected gain оправдывает стоимость;
- never increase bytes guard;
- quality strategy определяется benchmark/classification, а не одной цифрой.

## 10.2 unjs/ipx — ADAPT PATTERNS

Источник: https://github.com/unjs/ipx
Факты:
- ~2.45k stars;
- MIT;
- активный push 2026-09-07;
- позиционируется как secure high-performance image optimizer;
- использует Sharp/libvips;
- поддерживает автоматический выбор формата по Accept header;
- валидирует modifiers до передачи в Sharp.

Что берём:
- строгую validation boundary перед image engine;
- allowlisted modifiers вместо произвольной передачи параметров Sharp;
- auto-format negotiation как референс;
- идею тонкого proxy/adapter слоя.

Что не берём как есть:
- URL-transform DSL и CDN/proxy-модель не нужны для первого MCP;
- не строим собственный image CDN.

## 10.3 piephai/mcp-image-optimizer — STUDY / не зависимость

Факты:
- MIT;
- TypeScript;
- 12 stars / 2 forks;
- 15 commits;
- последний push 2025-11-25 — существенно слабее по активности, чем Sharp/IPX;
- URL/local files, batch, WebP/AVIF, resize/crop, LQIP, watermark, favicon.

Плюсы:
- хорошая проверка того, что generic MCP over Sharp очень легко собрать;
- простая установка в Claude/Codex/VS Code/Cursor;
- полезен для tool schema и packaging reference.

Минусы:
- слишком широкий generic image-tool scope;
- нет page-aware анализа;
- нет rendered dimensions/srcset/LCP/context;
- не найден зрелый security layer для remote URL fetch;
- небольшая доказательная база эксплуатации.

Решение:
- код как основную зависимость НЕ брать;
- изучить только packaging/tool schema/error handling;
- наш MCP делать уже и более task-oriented.

## 10.4 greatSumini/sharp-mcp — STUDY / REJECT AS BASE

Факты:
- MIT;
- ~11 stars / 6 forks;
- generic image session/manipulation/compression MCP.

Полезно:
- structured error responses;
- before/after byte reporting;
- session pattern как возможный reference для больших payloads.

Не подходит как база:
- generic manipulation surface;
- не решает website optimization intent;
- лишние tools повышают tool-selection noise.

## 10.5 Squoosh — STUDY, не production dependency первого MCP

Сильные стороны:
- зрелый UX сравнения качества;
- WASM/browser processing reference;
- best-in-class codec experimentation.

Практические риски:
- реальный открытый issue 2026: AVIF export в Safari 26.2 может падать с WASM memory error;
- большой кодовый стек относительно простого серверного MCP;
- браузерная кодек-совместимость создаёт лишний слой поддержки.

Решение:
- не тащить Squoosh runtime в первый серверный MCP;
- использовать как benchmark/UX/codec research reference;
- браузерный вариант рассмотреть позже отдельно.

## 10.6 ShortPixel MCP — STUDY COMPETITOR

Факт:
- `com.shortpixel.mcp/optimize` уже находится в Official MCP Registry;
- публичное позиционирование: optimize public image URLs через ShortPixel API для AI agents.

Вывод:
- сама функция `optimize_image_url` уже не дифференциатор;
- наш продукт должен стартовать выше уровня одиночной картинки: `analyze_page_images → decide → optimize → responsive output → before/after`.

## 10.7 Cleanor MCP — STUDY DISTRIBUTION/TRANSPORT

Полезные паттерны:
- hosted Streamable HTTP endpoint;
- zero-auth first-use;
- npm/local variant;
- REST capabilities рядом с MCP;
- machine-readable capabilities.

Решение:
- использовать как distribution/transport reference;
- не копировать 18+ generic utilities: широкий набор размывает category ownership.

## 10.8 Field Intelligence — подтверждённые боли

Повторяющиеся community patterns:
1. Люди не хотят вручную выбирать WebP/AVIF и собирать fallback/srcset; ценность — автоматизированный workflow.
2. AVIF часто выигрывает по размеру, но encode cost и perceived quality непредсказуемы; «AVIF для всего» — плохое правило.
3. Для LCP сначала надо доказать, что проблема именно в изображении; случайное сжатие всего сайта не равно оптимизации.
4. Lazy loading LCP image — повторяющаяся реальная ошибка.
5. На многих сайтах основной выигрыш даёт не «формат», а уменьшение oversized source до фактического rendered size.
6. CWV нельзя превращать в культ: оптимизация последних миллисекунд без бизнес-эффекта должна проигрывать Pareto Gate.

Продуктовый вывод:
LayerPorter должен отвечать не «какой quality поставить», а:
`что здесь реально тормозит → какой размер/формат нужен → сколько даст → безопасно ли менять`.

## 10.9 Security gate для remote image URL

Первый MCP нельзя публиковать без:
- только http/https;
- DNS/IP validation;
- block localhost/private/link-local/metadata/internal ranges;
- redirect re-validation на каждом hop;
- max redirects;
- max content-length и streamed byte cap;
- max decoded pixels/dimensions;
- magic-byte/type validation;
- response timeout + overall job budget;
- bounded concurrency/queue;
- resource cleanup;
- no arbitrary output path для remote hosted mode;
- no arbitrary Sharp options passthrough;
- allowlisted formats/options.

Это отдельный обязательный security contract первого runtime.

## 10.10 Финальная классификация шага 2

| Компонент | Статус | Решение |
|---|---|---|
| Sharp/libvips | KEEP | основное processing ядро |
| IPX | ADAPT PATTERNS | validation/auto-format/security adapter patterns |
| Squoosh | STUDY | benchmark/WASM/UX, не первый runtime |
| piephai MCP | STUDY | schemas/packaging, не dependency |
| sharp-mcp | STUDY | errors/byte metrics, не dependency |
| ShortPixel MCP | STUDY COMPETITOR | подтверждает commodity single-image optimization |
| Cleanor MCP | STUDY | remote transport/distribution patterns |
| собственные кодеки | REJECT | не писать |
| собственный generic image editor MCP | REJECT | не строить |
| собственный CDN | REJECT | не строить в MVP |

## 10.11 Архитектурное решение после шага 2

Первый runtime:

`MCP/HTTP boundary → URL/input security → page-context analyzer → policy/decision layer → Sharp adapter → quality/size guards → result/metrics`.

Ключевое конкурентное отличие:
- контекст страницы;
- rendered vs intrinsic dimensions;
- выбор формата по expected gain/cost;
- responsive variants;
- LCP-specific handling;
- no-regression guards;
- before/after evidence.

### Что категорически не пишем с нуля
- codecs;
- resize engine;
- AVIF/WebP encoder;
- generic image editor;
- CDN;
- arbitrary transform language;
- browser WASM stack для v1.
