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