# LP-091 — Шаг 30/30: финальный Pareto / Release Gate

Дата: 2026-09-10
Issue: #215

## Итог в одной строке

**ROADMAP 30/30 = COMPLETE. TECHNICAL CONTOUR = PASS. PUBLIC RELEASE = BLOCKED.**

Причина блокировки — не открытый safety-дефект в ядре, а незакрытые релизные prerequisites и разрыв между проверенными инженерными контрактами и реально подключённым пользовательским runtime.

---

## 1. Что проверено

### Метод 1 — интеграционный Gate

Merge-base проекта Page Optimizer: `84bc58ec2238f2dd874cf34c3a835af290924482`.

От него:
- актуальный `master` ушёл вперёд на **105 коммитов**;
- Page Optimizer contour — на **155 коммитов**.

По изменённым путям прямых пересечений не обнаружено:
- master: API install/uninstall/telegram, converter components, PT-BR/RU localized converters, root package version, sitemap;
- Page Optimizer: `.github/workflows/page-*`, `packages/image-core`, `packages/image-optimizer-mcp`, `packages/page-audit-extension`, MCP public pages/copy, `_internal`.

Вывод: ожидаемый merge-conflict risk ниже, чем показывает число коммитов, но релиз всё равно запрещён до сборки **свежей интеграционной ветки от текущего master** и повторного полного Gate на объединённом дереве.

### Метод 2 — продуктовый Pareto Gate

Проверено, какие элементы являются реальными пользовательскими функциями, а какие — внутренними контрактами/модулями.

### Метод 3 — технический / публикационный Gate

Финально прогнаны:
- Image MCP verification;
- Page Audit Extension verification;
- Astro public MCP pages build;
- integrated session gate.

Параллельно сверены актуальные внешние prerequisites:
- npm Trusted Publishing через OIDC остаётся рекомендуемым механизмом; workflow уже использует `id-token: write`, Node 24 и `npm stage publish`;
- Official MCP Registry является действующим публичным реестром; `server.json` проходит validator;
- Chrome Web Store требует минимальные permissions, точный single purpose, актуальные privacy/data disclosures и реальное тестирование перед публикацией.

---

## 2. Финальные CI результаты LP-091

- Image MCP Verify — run **34412129234** — SUCCESS.
- Page Audit Extension Verify — run **34412151886** — SUCCESS.
- Public MCP Pages Verify — run **34412171563** — SUCCESS.
- Integrated Session Gate — run **34412186184** — SUCCESS.

Технический Gate текущей feature-ветки: **PASS**.

---

## 3. Release Matrix

### `image-core`

**Статус: READY / INTERNAL**

Реально есть:
- Sharp-based deterministic transform;
- WebP/AVIF/JPEG/PNG;
- no-upscale;
- alpha/orientation/ICC guards;
- never-increase-bytes;
- page-aware image findings;
- safe binary candidate + verification;
- tests и benchmark.

Не является самостоятельным пользовательским продуктом.

### Website Image Optimizer MCP

**Статус: TECHNICALLY READY / PUBLIC RELEASE BLOCKED**

Реально есть:
- 5 MCP tools;
- stdio server;
- schema bounds;
- binary sanitization model-visible response;
- npm pack / clean install / start;
- Official MCP Registry metadata validator;
- release workflow с OIDC/stage/Registry gates.

Блокеры:
1. `package.json`: `private=true`.
2. `license=UNLICENSED`.
3. Не принято финальное решение по публичному source/repository. Текущий `server.json` указывает на приватный `layerporter-site`.
4. npm Trusted Publisher должен быть реально настроен на аккаунте/package.
5. MCP DNS ownership/private key должен быть реально настроен.
6. Перед публикацией артефакт должен быть собран поверх актуального master/integration tree.

### Public MCP pages

**Статус: TECHNICAL CANDIDATE / DEPLOY BLOCKED**

Astro build зелёный; страницы и structured data присутствуют.

Блокер: страницы пока живут в diverged feature history и не проверены в объединённом актуальном master.

### Page Audit Extension

**Статус: DEVELOPMENT PREVIEW / CWS RELEASE BLOCKED**

Реально пользователь получает:
- audit current page;
- deterministic findings;
- normalization/prioritization;
- безопасный Side Panel rendering;
- минимальные permissions: `activeTab`, `scripting`, `sidePanel`.

Критическое уточнение: текущий Side Panel **не подключает** Safe Fix, Bounded Agent и Continuous runtime. Он показывает audit и readiness информации.

Блокеры Chrome Web Store:
1. нет live-Chrome VERIFIED теста пользователем;
2. нет финального CWS listing/package pass;
3. требуется privacy/data-handling/single-purpose compliance review;
4. нельзя рекламировать extension как автономный Page Optimizer, пока соответствующий runtime не подключён.

### AI Fix Suggestions

**Статус: CONTRACT READY / USER FEATURE NOT IMPLEMENTED**

Есть bounded request/response schema, validator и review-only policy.

Нет:
- hosted model call;
- backend inference;
- provider credentials/runtime.

Следовательно формулировка «ИИ уже предлагает исправления» запрещена до подключения реального inference layer.

### Safe Fix — oversized image

**Статус: ENGINE READY / END-TO-END APPLY NOT IMPLEMENTED**

Есть candidate transform и deterministic re-verification.

Нет production write/artifact delivery/apply pipeline.

### Safe Fix — image width/height

**Статус: PREVIEW CONTRACT READY / ACTUAL SOURCE PATCH NOT IMPLEMENTED**

Есть safe markup plan, aspect-ratio guards и simulated re-audit.

Нет реальной source/DOM mutation.

### Bounded Agent Mode

**Статус: POLICY READY / EXECUTOR NOT IMPLEMENTED**

Есть hard external enforcement:
- 1 finding/iteration;
- max 3 iterations;
- explicit action allowlist;
- stop on failed verification;
- page content cannot authorize tools.

Нет пользовательского executor/runtime, который реально проходит весь цикл по странице.

### Continuous Website Optimization

**Статус: STATE MACHINE READY / CONTINUOUS RUNTIME NOT IMPLEMENTED**

Есть:
- NEW / PERSISTING / RESOLVED / REGRESSED;
- trend;
- duplicate/incomplete audit guards;
- review queue;
- delegation authority to Bounded Agent.

Нет:
- scheduler;
- persistence/database;
- site crawling;
- automatic execution.

### Full LayerPorter Page Optimizer

**Статус: PUBLIC PRODUCT RELEASE BLOCKED**

Архитектура и safety contour доказаны, но end-to-end user runtime ещё не соединён.

---

## 4. Открытые P0/P1

### Safety P0

**0 открытых.**

Ранее найденный P0 с untrusted HTML в Side Panel закрыт переходом на safe DOM/text rendering и CI guard.

### Release blockers — обязательны до соответствующего релиза

**RB-1 — Fresh-master integration.**
Создать интеграционную ветку от текущего master, перенести Page Optimizer contour, пройти site + Page Optimizer CI.

**RB-2 — MCP publication governance.**
Решить license/public source; убрать `private=true` только после решения; настроить npm OIDC и MCP DNS publishing; stage before publish.

**RB-3 — Extension truthfulness/live verification.**
Перед CWS — live test, privacy/listing compliance, точное позиционирование как read-only audit beta, если Safe Fix runtime ещё не подключён.

**RB-4 — No autonomous claims before wiring.**
Safe Fix / Agent / Continuous нельзя считать пользовательскими функциями до реального preview/apply/rollback/runtime verification.

### P1 после первого релиза

- observed LCP / PerformanceObserver + независимый Lighthouse reference;
- responsive `srcset/sizes` только при реальных generated artifact URLs;
- accessibility layer через axe-core;
- hosted AI boundary с untrusted-data isolation;
- artifact storage/delivery для image optimizer;
- source patch engine + preview/rollback;
- persistence/scheduler только после доказанного usage.

---

## 5. Pareto: что выпускать первым

### Релиз 1 — Website Image Optimizer MCP

Самый короткий путь к внешнему продукту, потому что:
- core существует;
- package существует;
- clean-install проверен;
- registry metadata валидна;
- не требует Chrome Web Store;
- не требует автономного source mutation.

Порядок:
1. Fresh-master integration.
2. Решение license/public source.
3. `private=false` только после решения.
4. npm Trusted Publisher configuration.
5. `stage-npm`.
6. clean install staged artifact / smoke.
7. public MCP pages deploy.
8. Official MCP Registry publish через domain ownership.
9. secondary registries/discovery only after official release evidence.

### Релиз 2 — Page Audit Extension read-only beta

Порядок:
1. интегрированная сборка;
2. live Chrome test;
3. UX final pass;
4. privacy/single-purpose/store metadata;
5. CWS candidate;
6. не обещать Safe Fix/AI/continuous до wiring.

### После этого

Safe Fix → verified preview/apply/rollback → Bounded Agent executor → hosted AI → Continuous runtime.

Не наоборот.

---

## 6. Финальная архитектура

`DETECT → NORMALIZE → PRIORITIZE → SUGGEST (optional) → POLICY GATE → SAFE CANDIDATE → VERIFY → ACCEPT/REJECT → HISTORY/DRIFT`

Важнейшая граница:

**LLM никогда не является authority layer.**

Authority остаётся у deterministic policy + verification. Continuous monitoring также не получает write-права автоматически.

---

## 7. Финальное решение

### Roadmap Gate

**PASS — 30/30 завершены.**

### Technical Architecture Gate

**PASS.**

### Public Release Gate

**BLOCKED BY DESIGN** до RB-1…RB-4 соответствующего продукта.

Это правильный результат: система не выдаёт readiness-contracts за уже работающую автономию и не публикуется поверх устаревшей ветки.
