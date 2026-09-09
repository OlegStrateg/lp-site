# LP-077 — Шаг 10/30: Session-2 Gate / архитектурный контракт MVP

Дата: 2026-09-09
Статус: DONE — GATE PASS
Ветка: `research/LP-077-page-optimizer-base`
Issue: #182 / LP-077

## 1. Назначение gate

Свести результаты шагов 6–9 в один контракт и ответить на вопрос: можно ли переходить к реализации Website Image Optimization MCP без архитектурных догадок и повторного исследования.

Решение: **PASS**.

## 2. Проверка расхождения с каноническим tracker

В мастер-дорожной карте шаг 9 первоначально описан как `Normalized Finding schema + SAFE/REVIEW/FORBIDDEN matrix`, а шаг 10 — как ADR первого MVP. В фактическом исполнении шаг 9 был расширен до полной Product Spec Website Image Optimizer MCP и уже содержит image Finding schema, risk/auto_fixability/verification_method, security contract, AI boundary и Definition of Done.

Чтобы не создавать фиктивный дополнительный шаг и не терять исходный контракт, шаг 10 закрывает оба требования gate:
1. нормализует общий Finding contract и SAFE/REVIEW/FORBIDDEN matrix на уровне MVP;
2. фиксирует ADR `reuse vs custom` и точную границу реализации.

Таким образом tracker остаётся 30-шаговым без перенумерации.

## 3. Единый Normalized Finding Contract

Каждый finding до передачи ИИ обязан иметь:
- `finding_id` — стабильный ID;
- `category`;
- `page_url`;
- `target` — URL/DOM selector/resource/file reference, только если подтверждён;
- `evidence` — факты, из которых получен finding;
- `current_state`;
- `expected_state`;
- `impact`;
- `confidence`;
- `estimated_gain` — только если измерим/обоснован;
- `risk`;
- `auto_fixability`: `SAFE | REVIEW | FORBIDDEN`;
- `recommended_capability` / tool;
- `verification_method`;
- `source_snapshot/hash/version` для будущего Safe Patch.

Правило: отсутствие evidence или target provenance не может превращаться в уверенный auto-fix.

## 4. SAFE / REVIEW / FORBIDDEN

### SAFE P0
При выполнении deterministic preconditions:
- image compression;
- resize без upscale;
- WebP/AVIF по policy;
- responsive variants;
- `srcset` / `sizes`;
- `width` / `height`;
- selected lazy-loading correction;
- `fetchpriority` / preload только для подтверждённого LCP/hero контекста.

### REVIEW
- alt при семантической неоднозначности;
- title/meta;
- canonical;
- schema;
- structural HTML/CSS;
- видимый текст и позиционирование.

### FORBIDDEN AUTONOMOUS
- business logic JS;
- checkout/payments;
- auth;
- analytics;
- реальные формы;
- backend/database;
- pricing/positioning;
- удаление блоков;
- secrets/CI permission changes;
- массовый refactor;
- прямой write в production/default branch.

## 5. ADR — что переиспользуем

### KEEP / direct dependency
- Sharp/libvips — image processing;
- Playwright — functional/visual verification;
- Lighthouse/Lighthouse CI — независимый performance reference/gate там, где уместно;
- web-vitals/PerformanceObserver — runtime CWV signals;
- axe-core — deterministic accessibility checks;
- Chrome MV3/Side Panel/Performance APIs — browser collection layer.

### ADAPT METHOD / PATTERNS
- IPX — validation boundary, allowlisted modifiers, format negotiation;
- Aider — Git isolation/diff/undo methodology;
- Stagehand — deterministic-first, observe-before-act, bounded context;
- Browser Use — domain/tool/secret restrictions;
- Addy web-quality methodology;
- SEO router methodology — progressive disclosure/evidence-first.

### BUILD — собственный LayerPorter слой
- page-context extraction;
- normalized Finding model;
- impact/confidence/prioritization policy;
- image decision policy;
- responsive planning;
- remote-input security boundary;
- SAFE/REVIEW/FORBIDDEN policy engine;
- typed patch contracts;
- verification decision contract;
- rollback/audit trail;
- MCP orchestration and evidence output.

### НЕ СТРОИМ
- image codecs;
- resize/compression algorithms;
- browser engine;
- Lighthouse clone;
- WCAG engine;
- generic crawler v1;
- generic image editor;
- CDN;
- universal coding/browser agent;
- собственный CI/CD;
- 100+ MCP tools.

## 6. Архитектура первого MVP

Короткий путь:

`Website Image Optimization MCP`
→ `Page Audit collector`
→ `Normalized Findings`
→ `first SAFE image fix`
→ `independent verification`
→ `accept/rollback`.

Первый implementation contour (шаги 11–15) ограничен Image MCP. Page Audit и Safe Patch не должны преждевременно проникать в этот runtime как универсальная платформа.

## 7. Runtime boundary Image MCP

`MCP transport`
→ `input/URL security`
→ `page/image context collector`
→ `deterministic rules`
→ `policy engine`
→ `Sharp adapter`
→ `guards`
→ `artifacts + markup recommendation + evidence`.

LLM не управляет кодеками, arbitrary Sharp options или файловой системой.

## 8. Distribution contract

После technical gate шага 15:
1. canonical product/MCP page + docs/privacy/security/benchmark;
2. GitHub/npm;
3. Official MCP Registry;
4. Claude;
5. ChatGPT;
6. Smithery;
7. Glama;
8. mcp.so;
9. только затем проверенные secondary surfaces.

Статус публикации:
`SUBMITTED → APPROVED → INDEXED → DISCOVERABLE → USED → REFERRAL/CITATION`.

Публикация без discoverability/usage не считается успехом.

## 9. Visibility / trust contract

До запуска зафиксирован baseline. После запуска сравнение 7/14/30/60 дней.

Раздельно:
- ordinary search;
- AI mentions/recommendations/citations;
- MCP/connector discovery;
- actual usage/referrals.

Trust строится через:
`canonical entity → reproducible evidence → independent validation → runtime trust → measurable usage/citation`.

P0 evidence asset: собственный воспроизводимый benchmark с методологией и before/after, а не поток SEO-статей.

## 10. Security contract до implementation

Обязательны:
- http/https allowlist;
- SSRF/private/link-local/metadata blocking;
- DNS/IP validation;
- redirect revalidation;
- byte/content-length/pixel/dimension caps;
- magic-byte validation;
- time/concurrency budgets;
- controlled temp/output paths;
- no arbitrary Sharp options;
- no direct production write;
- no self-expanding tools/permissions.

## 11. Definition of Ready — шаг 11

Implementation issue разрешено открыть только если:
- место runtime в repo подтверждено фактическим аудитом структуры;
- shared LayerPorter graphics/image core найден и граница reuse задокументирована;
- branch + recovery point созданы;
- package/runtime choice подтверждён существующей архитектурой;
- P0 tool schemas сверены со spec;
- security/resource defaults вынесены в явный config/policy;
- fixtures/tests определены до написания processing logic;
- никакие существующие production flows не меняются без необходимости.

## 12. Три независимые проверки gate

### A. Архитектурная
Для каждого слоя есть `KEEP / ADAPT / BUILD / DO NOT BUILD`; неопределённого core-компонента нет.

### B. Безопасность/обратимость
Remote input boundary, resource budgets, no-production-write и будущий rollback contract определены до кода.

### C. Продукт/Pareto
Первый runtime решает самостоятельную коммерческую задачу и одновременно переиспользуется будущим Page Optimizer; лишняя платформа не строится.

Результат: PASS / PASS / PASS.

## 13. Gate decision

**SESSION 2 = PASS.**

Можно переходить к шагу 11/30.

Нельзя на шаге 11 сразу писать код вслепую. Сначала pre-flight текущего repo:
- реальная структура;
- существующий shared image core;
- package manager/runtime;
- тестовая инфраструктура;
- deployment boundaries;
- recovery point;
- отдельная implementation issue/branch.

## 14. Следующий шаг

11/30 — создать implementation-задачу и провести pre-flight репозитория перед первой строкой runtime-кода.