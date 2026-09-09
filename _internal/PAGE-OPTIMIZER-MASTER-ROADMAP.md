# LayerPorter Page Optimizer — мастер-дорожная карта

Статус: LP-077 / Research baseline / 2026-09-09

## 1. Продуктовая формула

`AUDIT → PRIORITIZE → EXPLAIN → SAFE PATCH → VERIFY → COMPARE → ACCEPT/ROLLBACK`

Moat строится не на количестве checks, а на Verified Improvement Rate.

## 2. Главная метрика

Verified Improvement Rate = число применённых исправлений, которые дали измеримое улучшение без регрессии / все применённые исправления.

Дополнительные:
- audit → verified fix time;
- rollback rate;
- false-positive rate;
- average page-weight saving;
- LCP/INP/CLS change where valid;
- accepted fix rate;
- MCP active users/tool calls;
- referral/install/citation by distribution channel.

## 3. Stage 0 — Research & Architecture

### Цель
Закрыть вопрос «что уже существует и что мы НЕ должны писать».

### Используем
- LayerPorter Open Source First / Field Intelligence / Pareto Gate;
- skill-security-review methodology;
- GitHub repos/issues/discussions;
- competitors + forums + field cases.

### 20% действий
1. Reference registry.
2. Skill registry.
3. Distribution/trust map.
4. Normalized Finding schema.
5. SAFE/REVIEW/FORBIDDEN matrix.
6. ADR: reuse vs custom.

### Проверки
- technical maturity;
- real-world evidence;
- Pareto score.

### Gate
Нет custom runtime до завершения research baseline.

## 4. Stage 1 — Website Image Optimization MCP

### Цель
Первый работающий модуль, который одновременно полезен сам и станет safe-fix инструментом будущего Page Optimizer.

### Основа
- Sharp/libvips — processing;
- Squoosh — browser/WASM reference;
- existing image MCPs — interface/anti-pattern study;
- Addy webperf methodology.

### Pareto scope
Tools:
- analyze_page_images
- optimize_image
- optimize_page_images
- generate_responsive_variants
- compare_image_versions

### Дифференциация
Не «convert to WebP», а page context:
rendered dimensions + responsive variants + LCP role + before/after bytes + markup recommendation.

### Не делать
accounts, billing, CDN, 20 transforms, editor UI, autonomous site write.

### Verification
1. image correctness/quality;
2. byte savings;
3. page before/after.

### Gate
MCP стабилен, no-upscale/alpha/orientation guards, measurable savings, clear tool schemas.

### Distribution после gate
Official MCP Registry → Claude → ChatGPT → Smithery → Glama → mcp.so → GitHub/npm → verified secondary directories.

## 5. Stage 2 — Page Audit Extension

### Цель
Пользователь открывает страницу и получает короткий приоритетный список реально важных проблем.

### Основа
- GoogleChrome Chrome Extensions skill;
- Lighthouse/Lighthouse CI;
- web-vitals;
- axe-core;
- Performance/Resource Timing;
- deterministic DOM/SEO rules.

### Pareto checks P0
- LCP/INP/CLS signals;
- page weight/network;
- hero/LCP images;
- oversized images;
- render blocking;
- JS/CSS weight;
- indexability;
- canonical;
- title/meta/H1;
- broken resources;
- console errors.

P1: srcset/lazy/preload/fonts/alt/schema/internal links.

### Output
Не 100 ошибок. Группы:
- СДЕЛАТЬ СЕЙЧАС;
- ВЫСОКИЙ ЭФФЕКТ;
- ПОЗЖЕ;
- НЕ ТРОГАТЬ / passed.

### Verification
- extension minimal permissions;
- audit accuracy fixtures;
- extension itself does not contaminate reference performance measurement;
- cross-check with standalone Lighthouse/Playwright where needed.

## 6. Stage 3 — Normalized Findings + AI Fix Suggestions

### Цель
Сделать AI reasoning дешёвым, доказательным и ограниченным.

### Архитектура
`RAW → NORMALIZE → DEDUPE → RULES → IMPACT/CONFIDENCE → TARGETED EVIDENCE → LLM`

Finding fields:
- id/category/severity;
- impact/confidence;
- evidence/target;
- current/expected state;
- suggested_fix;
- estimated_gain;
- risk;
- auto_fixability;
- verification_method.

### Skill
SEO router methodology + собственный `page-optimizer-findings`.

### Pareto
Сначала AI только объясняет/планирует. Никакой записи.

### Gate
AI suggestion всегда с evidence; hallucinated files/selectors/claims отклоняются deterministic layer.

## 7. Stage 4 — First Safe Fixes

### Цель
Первая автоматизация с низким blast radius.

### SAFE P0
- image compression;
- resize;
- WebP/AVIF;
- responsive variants;
- srcset/sizes;
- width/height;
- selected lazy/fetchpriority/preload fixes under strict rules.

### REVIEW
- alt content;
- title/meta;
- canonical/schema;
- HTML/CSS structural changes.

### FORBIDDEN autonomous
- business JS;
- checkout/payments;
- auth;
- analytics;
- forms/backend/database;
- pricing/positioning;
- deleting blocks;
- mass refactor.

### Основа
Aider Git model + improve-codebase safety + SafeAgent concepts.

### Pipeline
snapshot → branch/workspace → patch → diff validation → preview → tests → compare → accept/rollback.

### Gate
No direct production write. Failed verification always rollback/abort.

## 8. Stage 5 — Verification Engine

### Цель
Независимо доказать, что fix действительно улучшил страницу и ничего не сломал.

### Три слоя
1. Machine: Lighthouse/DOM/network/SEO/a11y.
2. Visual: Playwright before/after/diff.
3. Functional: navigation/CTA/forms/critical interactions according to page contract.

### Skills/methods
Playwright + autoreview + review-swarm pattern.

### Gate
`fixed` status возможен только после verification. AI self-report не является evidence.

## 9. Stage 6 — Expanded Safe Fix Library

Добавлять только fixes с доказанным:
Impact × Confidence × Reuse / Cost × Complexity × Risk.

Каждый fix type имеет:
- preconditions;
- allowed targets;
- patch strategy;
- rollback;
- verification contract;
- failure fixtures.

Не расширять allowlist только потому, что model «умеет».

## 10. Stage 7 — Bounded Agent Mode

### Цель
ИИ сам выбирает SAFE проблемы и проводит цикл исправления.

### Основа
Stagehand deterministic-first principle; browser-use только как research reference.

### Loop
GOAL → AUDIT → SELECT SAFE → PLAN → PATCH → VERIFY → DECIDE.

### Ограничения
- bounded iterations;
- bounded files/lines/cost;
- allowlisted tools;
- no privilege expansion;
- no production direct write;
- full audit log.

### Gate
Rollback/false-positive rate находятся ниже заранее установленного threshold на controlled fixtures/pilots.

## 11. Stage 8 — Continuous Website Optimization

### Цель
После push/deploy автоматически находить регрессии и создавать безопасный fix PR.

### Основа
Связать с LP-072:
report-only → baseline → regression gate → target budgets.

### Flow
Git push → Preview → Audit → Regression → Safe Fix candidate → Verify → PR.

### Не делать
Собственный CI/CD. Использовать GitHub Actions/Cloudflare существующего проекта.

## 12. Stage 9 — AI/SEO discovery flywheel

Это не последний маркетинговый шаг, а параллельный измеряемый трек после первого пригодного MCP.

### Assets
- canonical product page;
- MCP page;
- docs;
- public GitHub repo where appropriate;
- package page;
- benchmark/research;
- privacy/security;
- release notes.

### Distribution sequence
1. Official MCP Registry.
2. Claude Connectors.
3. ChatGPT Plugins/Apps.
4. Smithery.
5. Glama.
6. mcp.so.
7. skill directories for genuinely useful public SKILL.md.
8. relevant awesome lists/product/dev directories after quality review.

### Rule
В каждом поле, где разрешены website/homepage/docs/repository — использовать canonical LayerPorter URLs последовательно.

### Measurement
baseline → submit → approved/indexed/discoverable → 7/14/30/60 days.
Separate metrics for discovery, usage, referral, brand mention, AI citation.

## 13. Field Intelligence cadence

Перед каждым stage implementation искать:
- latest GitHub alternatives/issues/releases;
- actual competitor behavior;
- Reddit/TechSEO/bigseo/SEO discussions;
- BlackHatWorld only as hypothesis source;
- official docs for requirements/policies;
- case studies/raw experiments;
- our own GSC/analytics/AI Search Observatory.

Любой новый claim:
HYPOTHESIS → EVIDENCE → COUNTER-EVIDENCE → RISK → COST → UPSIDE → TEST → METRIC → DECISION.

## 14. Tracker mode

Для каждого значимого шага фиксировать:
- LP ID;
- status;
- branch;
- HEAD;
- evidence added;
- decision;
- files changed;
- tests/checks;
- blocker;
- next step.

Максимум 2 активные задачи одновременно, как уже принято в LayerPorter: одна research/measurement + одна implementation.

## 15. Pareto stop-rule

Если следующий технический слой не повышает одну из величин:
- acquisition/discovery;
- conversion/adoption;
- retention/reuse;
- verified outcome quality;
- development speed/reuse;
он не входит в ближайший sprint.

Сначала закрываем самый короткий путь:
`Image Optimization MCP → distribution → Page Audit → prioritized Findings → first verified safe image fix`.

Это и есть MVP, после которого уже есть самостоятельный продукт и доказательство всей архитектуры.

---

# 16. Канонический execution tracker — 30 шагов

Правило отчёта: каждый шаг закрывается форматом `N/30 → результат → проверки → Git/МИТ → следующий шаг`. Один шаг не считается закрытым, если нет измеримого выхода или зафиксированного решения `НЕ ДЕЛАТЬ`.

## Сессия 1 — Research Gate и архитектура (1–5/30)

1. **Зафиксировать 30-шаговый execution tracker и границы LP-077.** Выход: канонический список шагов, session grouping, stop-rules, MIT sync.
2. **Референсы Image Optimization MCP.** GitHub/repos/issues/releases/licenses + конкуренты; KEEP/ADAPT/STUDY/REJECT.
3. **Референсы Page Audit Extension.** Lighthouse/web-vitals/axe/DevTools/extension auditors + реальные ограничения Manifest V3.
4. **Референсы Safe Patch + Verification + Agent loop.** Aider/Playwright/Stagehand/Browser Use/SafeAgent-подобные подходы; blast-radius и rollback patterns.
5. **Скилы и security review.** Для каждого этапа: официальный/проверенный skill или извлечённая методика; ADOPT / EXTRACT METHOD / REJECT.

Gate сессии 1: доказано, что мы знаем, что переиспользуем, что не пишем и почему.

## Сессия 2 — Дистрибуция, доверие и продуктовая спецификация (6–10/30)

6. **Карта всех релевантных площадок обнаружения.** MCP Registry, Claude, ChatGPT, Smithery, Glama, mcp.so, GitHub, npm, skill/agent/dev directories; поля Website/Homepage/Docs/Privacy/Repo.
7. **Field Intelligence по AI/SEO trust.** Форумы, Reddit, Issues, реальные кейсы: что даёт discovery/entity/link value, что является мусорной гипотезой.
8. **Baseline AI Search Observatory.** Набор коммерческих prompts, конкуренты, mention/citation/referral baseline до запуска.
9. **Normalized Finding schema + SAFE/REVIEW/FORBIDDEN matrix.** Единый контракт аудита и исправлений.
10. **ADR архитектуры первого MVP.** Точная граница: Image Optimization MCP → Audit → Findings → first safe fix; reuse vs custom decisions.

Gate сессии 2: можно открыть implementation issue без архитектурных догадок.

## Сессия 3 — Website Image Optimization MCP (11–15/30)

11. **Создать отдельную implementation-задачу и pre-flight.** Repo/branch/HEAD/scope/files/tests; определить место runtime в текущей архитектуре.
12. **Собрать минимальное image-core adapter.** Sharp/libvips или подтверждённая альтернатива; no-upscale, alpha, orientation, output guards.
13. **Реализовать page-aware analysis.** Rendered dimensions, intrinsic dimensions, current format/bytes, LCP/hero role where reliable, expected saving.
14. **Реализовать Pareto MCP tools.** Только 5: analyze_page_images / optimize_image / optimize_page_images / generate_responsive_variants / compare_image_versions.
15. **Benchmark и verification Image MCP.** Качество, bytes, responsive output, failure fixtures, performance; закрыть MCP technical gate.

Gate сессии 3: первый самостоятельный полезный MCP работает и доказан before/after.

## Сессия 4 — Публичная упаковка и AI/MCP distribution (16–20/30)

16. **Product/MCP page + docs.** Канонические URL, machine-readable docs, examples, privacy/security, benchmark; без псевдо-GEO.
17. **Техническая индексируемость и AI-crawlability.** robots/canonical/sitemap/schema where eligible/OAI-SearchBot/Claude search access; никаких ranking claims без evidence.
18. **Official MCP Registry + GitHub/npm.** Публикация, проверка INDEXED/DISCOVERABLE, canonical website links.
19. **Claude/ChatGPT submission.** Требования, модерация, карточки, сайт/доки/privacy, проверка реальной discoverability после approval.
20. **Smithery/Glama/mcp.so + quality secondary directories.** Только релевантные площадки; фиксировать discovery/entity/link/spam value отдельно.

Gate сессии 4: продукт не просто опубликован, а имеет измеряемый distribution baseline и статус по каждой площадке.

## Сессия 5 — Page Audit + Findings + first safe fix (21–25/30)

21. **Минимальный Page Audit Extension shell.** Manifest V3, Side Panel, минимальные permissions, без тяжёлого дублирующего движка.
22. **P0 deterministic audit.** Images, page weight/network, indexability, canonical/title/meta/H1, broken resources, console, Core Web Vitals signals where valid.
23. **Prioritization engine.** Impact × Confidence × Reuse / Cost × Complexity × Risk; вывод «сейчас / высокий эффект / позже / не трогать».
24. **AI Fix Suggestions.** Только после normalize/dedupe/rules; evidence-bound context; hallucinated selectors/files/claims rejected.
25. **First Safe Image Fix.** Snapshot → patch → diff → preview → tests → before/after → accept/rollback; direct production write запрещён.

Gate сессии 5: полный контур `audit → prioritized finding → safe image fix → verification` работает хотя бы на контролируемых fixtures/pilot pages.

## Сессия 6 — Verification, bounded agent и релизный gate (26–30/30)

26. **Verification Engine.** Machine + visual Playwright diff + functional contract; AI self-report не считается evidence.
27. **Expanded safe-fix library.** Добавлять только типы с доказанным Pareto; каждый имеет preconditions/patch/rollback/verification contract.
28. **Bounded Agent Mode.** GOAL → AUDIT → SELECT SAFE → PLAN → PATCH → VERIFY → DECIDE; лимиты итераций/files/cost/tools.
29. **Continuous Optimization pilot.** Связать с LP-072: Preview → regression → safe fix candidate → verify → PR; не строить собственный CI/CD.
30. **Release/measurement gate.** Verified Improvement Rate, rollback/false-positive, audit→fix time, MCP usage, discovery/referral/citation 7/14/30/60; решение SCALE / RETEST / STOP по каждому модулю.

Gate сессии 6: система доказала не «умение ИИ что-то менять», а повторяемое измеримое улучшение без регрессий.

## Текущий прогресс

- **1/30 — ACTIVE**: канонический execution tracker фиксируется в roadmap + MIT + LP-077 issue.
- 2/30–30/30 — BACKLOG до закрытия предыдущего gate, кроме параллельного измерительного трека, если он не блокирует основную реализацию.
