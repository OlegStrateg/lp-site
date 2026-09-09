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