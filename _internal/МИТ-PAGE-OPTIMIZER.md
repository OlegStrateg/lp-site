# МИТ — LAYERPORTER PAGE OPTIMIZER

Статус: ACTIVE
Дата начала: 2026-09-09
Master tracker: GitHub Issue #153
Основная исследовательская задача: LP-077 / Issue #182
Рабочая ветка исследования: `research/LP-077-page-optimizer-base`

## Постоянное правило ведения

Этот файл является обязательным МИТ-журналом продуктового контура LayerPorter Page Optimizer.

Без отдельного напоминания владельца сюда фиксируются все значимые события по проекту:

- новые продуктовые решения;
- изменения стратегии и дорожной карты;
- принятые и отброшенные архитектурные варианты;
- результаты GitHub/Open Source First исследования;
- найденные референсы и анти-референсы;
- выбранные skills/методики и результаты их security review;
- Field Intelligence: форумы, Issues, Discussions, реальные кейсы и контрдоказательства;
- SEO / AI Search / MCP / agent distribution решения;
- hypothesis → evidence → counter-evidence → risk → test → metric → decision;
- Pareto Gate;
- issue / branch / PR / commit / tag;
- проверки и результаты before/after;
- blockers и следующий шаг;
- изменения статуса CANDIDATE / VERIFIED / DONE.

Запрещено считать чат, память агента или локальный файл источником истины. GitHub остаётся источником истины.

---

## LP-077 — База Page Optimizer

Дата: 2026-09-09
Статус: IN PROGRESS — RESEARCH / ARCHITECTURE ONLY
Issue: https://github.com/OlegStrateg/layerporter-site/issues/182
Branch: `research/LP-077-page-optimizer-base`

### Продуктовый контур

`Audit → Prioritize → Explain → Safe Patch → Preview/Test → Before/After → Accept/Rollback`.

Этапы развития:

1. Website Image Optimization MCP.
2. Page Audit Extension.
3. AI Fix Suggestions.
4. One-click Safe Fixes.
5. Agentic Autonomous Optimization.
6. Continuous Website Optimization.

### Архитектурные ограничения

- использовать общее графическое ядро LayerPorter;
- не дублировать image processing;
- не писать собственный Lighthouse, crawler, browser engine, image codec или accessibility engine без доказанной необходимости;
- deterministic checks и normalization выполняются до LLM;
- AI получает bounded context, а не сырые мегабайты audit JSON;
- автоматические изменения только по allowlist;
- обязательны snapshot / diff / preview / test / compare / rollback;
- production нельзя менять напрямую из LLM.

### Safe allowlist первой автономной версии

Разрешено автоматически:

- image compression;
- resize;
- WebP / AVIF;
- responsive variants;
- `srcset` / `sizes`;
- `width` / `height`;
- lazy loading;
- preload / fetchpriority для подтверждённого LCP;
- alt;
- ограниченные технические meta;
- простые HTML/CSS patches без изменения дизайна.

Запрещено автономно:

- JS business logic;
- checkout / payments;
- forms;
- analytics;
- auth;
- backend;
- database;
- pricing;
- positioning;
- удаление блоков;
- массовый refactor.

### Open Source First — базовые кандидаты

- Sharp / libvips — серверная обработка изображений;
- Squoosh — browser/WASM reference;
- Lighthouse / Lighthouse CI — performance audit и regression gate;
- web-vitals — LCP/CLS/INP signals;
- axe-core — accessibility checks;
- Playwright — functional и visual verification;
- Chrome DevTools / Performance APIs — browser signals;
- Aider — reference для Git isolation / diff / rollback;
- Stagehand — deterministic-first browser automation reference;
- Browser Use — reference для browser agents, не кандидат на прямое копирование всего стека;
- существующие image optimization MCP — анализировать и переиспользовать только зрелые архитектурные части.

Перед custom implementation обязателен ответ: `Почему существующие решения не подходят?`

### Реестр skills / методик

Skills не считаются доверенными автоматически.

Для каждого skill:

`SOURCE → MAINTAINER → CONTENT REVIEW → SECURITY REVIEW → METHOD VALUE → ADOPT / EXTRACT METHOD / REJECT`.

Основные компетенции по этапам:

1. Image optimization — image engineering + Core Web Vitals.
2. Audit — performance engineering + technical SEO + accessibility.
3. Chrome extension — Manifest V3 + Side Panel + permissions minimization.
4. Findings normalization — deterministic rules + bounded context architecture.
5. AI recommendations — agent architecture + domain expert review.
6. Safe patching — Git / DevSecOps / minimal diff / rollback.
7. Verification — QA automation + visual regression + functional testing.
8. Agent mode — bounded autonomous agents + allowlisted tools.
9. Continuous optimization — CI/CD + SRE + performance regression engineering.
10. Distribution — MCP/App distribution + SEO + AI Search observability.

### AI / SEO / MCP distribution

Цель — максимальная обнаруживаемость продукта без каталогового спама.

Каждое размещение оценивается отдельно по четырём величинам:

- discovery value;
- usage value;
- entity/trust value;
- SEO/link value;
- spam/risk отдельно.

Приоритетные поверхности:

- Official MCP Registry;
- Claude Connectors Directory;
- ChatGPT Plugins / Apps directory;
- Smithery;
- Glama;
- mcp.so и другие проверенные MCP directories;
- GitHub;
- npm;
- релевантные skill / agent directories;
- профильные каталоги developer tools, если есть реальная editorial/discovery ценность.

Где площадка позволяет указать Website / Homepage / Documentation / Privacy / Repository, использовать канонический `https://layerporter.com/` или наиболее релевантную продуктовую страницу.

Не считать наличие MCP, `llms.txt`, schema или каталожной ссылки прямым ranking factor без собственного evidence.

### Трек обнаружения

Для каждого размещения хранить статус:

`SUBMITTED → APPROVED → INDEXED → DISCOVERABLE → USED → REFERRAL / CITATION`.

Факт публикации без discoverability не считается достигнутой дистрибуцией.

### AI Search observability

Отдельно измерять:

- ChatGPT / ChatGPT Search;
- Claude;
- Gemini / Google AI Overviews / AI Mode;
- Perplexity;
- Copilot;
- другие релевантные surfaces.

Метрики:

- brand mention;
- citation;
- cited URL;
- citation position;
- recommendation;
- competitors shown;
- source set;
- query fan-out;
- referral;
- изменение во времени.

Не делать вывод по одному prompt run.

### Главная продуктовая метрика

`Verified Improvement Rate`:

количество применённых исправлений, давших измеримое улучшение без регрессии / все применённые исправления.

Дополнительные:

- bytes saved;
- page weight reduction;
- LCP improvement;
- accepted fixes;
- rollback rate;
- false-positive rate;
- audit → verified fix time.

### Pareto-очередь

1. Image Optimization MCP.
2. Minimal Page Audit.
3. Findings prioritization.
4. AI Fix Suggestions.
5. Safe Image Fix.
6. Verification Engine.
7. Остальные Safe Fixes.
8. Bounded Agent Mode.
9. Continuous Optimization.

### Что сознательно не делать сейчас

- собственный браузер;
- собственный crawler;
- собственный Lighthouse;
- собственные кодеки;
- 100+ MCP tools;
- сложную multi-agent систему;
- autonomous arbitrary JS rewrite;
- собственный CI/CD;
- бесконечный AI loop;
- массовые SEO/AI каталоги ради количества ссылок.

### Три обязательные проверки каждого этапа

1. Техническая: repo/activity/license/issues/security/performance.
2. Практическая: users/issues/forums/case studies/real implementations.
3. Продуктовая: `Impact × Confidence × Reuse / Cost × Complexity × Risk`.

### Текущая Git-фиксация

Research branch HEAD на момент создания МИТ: `b7959b2bfe8a7811e8efd4588531bacc7827456c`.

Существующие research commits LP-077:

- база референсов;
- реестр skills;
- AI/SEO/MCP distribution map;
- master roadmap.

Код продукта в LP-077 не изменяется.

### Следующий шаг

Углубить research-базу по каждому этапу:

- top GitHub implementations;
- Issues / Discussions;
- реальные community pain points;
- security/licensing;
- skills и проверенные методики;
- submission forms / directory requirements;
- website-link opportunities;
- фактические результаты AI discovery;
- затем закрыть LP-077 research gate и только после этого создавать implementation issue для первого модуля Website Image Optimization MCP.
