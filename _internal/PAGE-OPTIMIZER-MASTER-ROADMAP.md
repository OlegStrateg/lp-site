# LayerPorter Page Optimizer — мастер-дорожная карта

Статус: LP-077 / усиленная версия 2026-09-13 / синхронизация LP-101 + LP-102
Источник истины состояния: GitHub `OlegStrateg/layerporter-site`.

Этот файл продолжает исходную 30-шаговую дорожную карту LP-077. Количество шагов не увеличивается: новые исследования встроены внутрь существующих gates, чтобы не создавать параллельный проект.

## 1. Продуктовая формула

Основной продуктовый цикл:

`AUDIT → PRIORITIZE → EXPLAIN → SAFE PATCH → VERIFY → COMPARE → ACCEPT / ROLLBACK`

Контур дистрибуции и активации:

`PROBLEM SEARCH → DISCOVERY → FREE / LOW-FRICTION VALUE → TRUST → INSTALL / CONNECT → FIRST VERIFIED SUCCESS → SECOND SESSION → REPEAT / SHARE → REFERRAL / CITATION`

Главный moat — не количество checks/tools/listings, а повторяемое доказанное улучшение с низким риском и коротким путём до результата.

Ключевой activation-принцип: там, где инфраструктура позволяет, пользователь сначала получает доказательство проблемы и ценности, а сложный connect/auth начинается только перед защищённым действием.

## 2. Главные метрики

### Продукт

`Verified Improvement Rate = verified improvements without regression / applied fixes`.

Дополнительные:
- audit → verified fix time;
- accepted fix rate;
- rollback rate;
- false-positive rate;
- average byte saving;
- LCP/INP/CLS delta только там, где measurement валиден;
- regression rate.

### MCP activation / retention

- audit started / succeeded;
- meaningful finding shown;
- install/connect started;
- install/connect completed;
- first successful workflow;
- second session / second successful workflow;
- 7d active;
- completed workflows / active user;
- failure rate;
- latency P50/P95;
- tool-call efficiency;
- cost per first successful workflow.

### Discovery

- Registry exact-version presence;
- downstream discoverability;
- client marketplace/gallery presence;
- referral by source;
- brand mention / recommendation / citation / cited URL;
- npm downloads/stars/directory rank — secondary vanity signals, not primary success metrics.

## 3. Архитектурные стоп-правила

1. Open Source First: mature solution → adapt → thin adapter → custom only with evidence.
2. Deterministic policy before LLM reasoning.
3. No direct autonomous production write.
4. SAFE / REVIEW / FORBIDDEN остаются отдельными классами.
5. Failed verification → abort/rollback.
6. AI self-report не выставляет VERIFIED.
7. Один finding за bounded iteration; agent не расширяет собственный allowlist.
8. Не строить 20 MCP / 50 tools до доказанного usage компактного surface.
9. Distribution work не блокирует core product loop, если не является P0 release/security gate.
10. Нельзя заявлять compatibility/security/performance без exact evidence.
11. Remote MCP не получает отдельный image policy/core: transport/deployment меняются, продуктовые guards остаются едиными.
12. OAuth не становится blocker бесплатного read-only value, пока нет защищённого пользовательского состояния или действия.

## 4. Технологическая база — текущий ADR

### KEEP
- Sharp/libvips — image processing;
- Lighthouse/Lighthouse CI;
- web-vitals;
- axe-core;
- Playwright;
- Chrome APIs;
- Git/GitHub isolation + rollback;
- Cloudflare как единый production control plane.

### ADAPT
- IPX validation/allowlist patterns;
- Aider Git safety methodology;
- Stagehand deterministic-first patterns;
- Browser Use restrictions as research reference;
- official MCP Inspector CLI for independent protocol verification;
- Cloudflare Worker как edge/control-plane для будущего Remote;
- Cloudflare Container как full Node/Linux runtime для переиспользования exact Sharp/libvips core;
- private R2 как кандидат shared remote artifact store.

### BUILD ONLY WHERE UNIQUE
- page context;
- normalized Findings;
- prioritization/policy;
- responsive image planning;
- remote-input security contract;
- typed patch/verification contracts;
- evidence/orchestration;
- product activation flow;
- thin Remote transport/auth/artifact adapters поверх существующего core.

### DO NOT BUILD
- codecs;
- Lighthouse/WCAG clone;
- generic crawler/editor/CDN;
- universal autonomous agent;
- own CI/CD;
- arbitrary transform DSL;
- второе cloud-only image policy/core.

## 5. Protocol currency rule

Текущий `stdio/npm` release не переписывается ради новой спецификации.

Будущий Remote MCP обязан проходить отдельный research/pre-flight по MCP `2026-07-28`:
- stateless core;
- modern discovery path / `server/discover`;
- `createMcpHandler` как приоритетный SDK entry для нового HTTP path;
- header routing;
- modern authorization/CIMD direction;
- modern + required legacy client compatibility;
- не строить новую архитектуру вокруг deprecated HTTP+SSE/DCR.

Remote deployment ADR:

`mcp.layerporter.com/mcp → Cloudflare Worker → Cloudflare Container (exact shared Node/Sharp core) → private remote artifact store`.

Remote rollout делится на два уровня:
- **R0:** bounded public URL audit без OAuth, value-before-auth;
- **R1:** per-tool OAuth protected optimization только после activation evidence.

Пользовательские private bytes, batch upload и production write не входят в первый Remote contour.

## 6. Канонический execution tracker — 30 шагов

Правило закрытия каждого шага:

`N/30 → measurable result → 3 проверки → Git evidence → status → next step`.

Три обязательные проверки:
1. техническая;
2. пользовательская/реальный сценарий;
3. продуктовая/метрика/Парето.

---

# Сессия 1 — Research Gate и архитектура (1–5/30)

### 1. Зафиксировать execution tracker и границы LP-077

Выход: 30 шагов, session gates, stop-rules, issue/MIT sync.

**Статус: DONE.**

### 2. Референсы Image Optimization MCP

GitHub/repos/releases/issues/licenses/competitors → KEEP / ADAPT / STUDY / REJECT.

Ключевое решение: generic URL→compress уже commodity; LayerPorter дифференцируется page context + evidence.

**Статус: DONE.**

### 3. Референсы Page Audit Extension

Lighthouse/web-vitals/axe/DevTools/Manifest V3/Side Panel/measurement contamination/minimal permissions.

**Статус: research baseline completed ранее; перед implementation обязателен freshness check.**

### 4. Safe Patch + Verification + Agent loop

Канонический цикл:

`BASELINE → SNAPSHOT → SCOPE → PLAN → VALIDATE TARGETS → PATCH → STATIC → PREVIEW → FUNCTIONAL → VISUAL → RECHECK → COMPARE → ACCEPT/ROLLBACK`.

**Статус: DONE.**

### 5. Skills + security review

Для каждого внешнего skill/method: ADOPT / EXTRACT METHOD / REJECT + security/license/data path.

**Статус: research gate completed ранее; re-check перед новым dependency/skill.**

**Gate Сессии 1:** PASS.

---

# Сессия 2 — Дистрибуция, доверие и продуктовая спецификация (6–10/30)

### 6. Карта discovery surfaces

Разделить: Registry / client marketplace / aggregator / package registry / skill directory / community / owned site.

Не смешивать submission и usage.

**Статус: DONE, усилено 2026-09-13.**

### 7. Field Intelligence по AI/SEO/MCP trust

Обязательная модель:

`HYPOTHESIS → EVIDENCE → COUNTER-EVIDENCE → RISK → COST → UPSIDE → TEST → METRIC → DECISION`.

Official docs = requirements/policy; forums = hypotheses; собственные измерения = решение.

**Статус: DONE, продолжается как cadence.**

### 8. Baseline AI Search / Discovery Observatory

Search / AI Answer / MCP Discovery отдельно.

Измерять repeated prompt set, mention/recommendation/citation/cited URL/share of voice/referral/discovery.

**Статус: DONE baseline; checkpoints 7/14/30/60.**

### 9. Normalized Finding + SAFE/REVIEW/FORBIDDEN

Каждый Finding: evidence/target/current/expected/impact/confidence/risk/fixability/verification.

**Статус: DONE через Session-2 gate.**

### 10. ADR первого MVP

Первый доказательный контур:

`Image MCP → Page Audit → Findings → first SAFE image fix → independent verification → accept/rollback`.

**Статус: DONE / PASS.**

**Gate Сессии 2:** PASS.

---

# Сессия 3 — Website Image Optimization MCP (11–15/30)

### 11. Implementation pre-flight

Repo/branch/HEAD/scope/files/tests/recovery point; no unrelated refactor.

### 12. Shared image-core adapter

Sharp/libvips; no-upscale, alpha, orientation, colors, never-increase-bytes, resource limits.

### 13. Page-aware analysis

HTTP fast mode не выдумывает browser facts. Rendered dimensions/currentSrc/browser LCP только из реального browser measurement или explicit input.

### 14. Pareto MCP surface

Фактический release surface уже вырос до 7 tools. Не добавлять новые до usage evidence.

Критический result contract:

`tool → resource_link → resources/read → binary artifact`.

### 15. Technical verification

Tests + clean pack/install + real MCP client + binary decode + limits/security + native release dry-run.

**Текущий фактический статус Сессии 3:** implementation интегрирован в repo и native dry-run прошёл на release SHA `8ca11132b8cec267d1b88ff85232d58483353c63`; дальнейший внешний release evidence относится к Сессии 4.

---

# Сессия 4 — Public Release, Trust, Client Install и Distribution (16–20/30)

Эта сессия существенно усилена исследованиями LP-077 / LP-099 / LP-100 / LP-101 / LP-102.

## 16. Trust foundation + canonical metadata + product/docs

Собрать единый truth source для:
- package name/version;
- MCP identity;
- homepage/docs/repository/privacy;
- tool descriptions;
- `server.json`;
- client install snippets;
- future marketplace metadata.

Обязательные публичные доказательства:
- product/MCP page;
- docs;
- SECURITY / PRIVACY / permissions & side-effects matrix;
- known limitations;
- benchmark/evidence без необоснованных claims.

Trust baseline отдельно подготовлен в LP-099:
- factual SECURITY/PRIVACY boundary;
- public support route;
- fail-closed release preflight;
- `mcp-scan` не становится mandatory до проверки его own data path.

**Gate:** metadata consistency test PASS; public claims match actual runtime; trust docs входят в следующий package candidate только как новая версия, не как попытка изменить immutable `0.1.0`.

## 17. Exact public package integrity + independent protocol verification

Проверить exact `@layerporter/image-optimizer-mcp@0.1.0` из публичного npm:
1. clean install outside monorepo;
2. exact expected tools;
3. optimize → resource link → read;
4. full decode;
5. MIME / bytes / SHA-256 / dimensions;
6. public package files equivalent to authorized release source;
7. MCP Inspector CLI independent smoke;
8. dependency/security audit.

LP-098 уже подготовил отдельный verification contour и PR.

**Текущий блокер:** GitHub-hosted runner jobs завершаются до первого шага (`steps=null` / runner infrastructure), поэтому это не product FAIL и не PASS. Локальная среда также не имеет DNS-доступа к npm. Нельзя подменять внешний smoke локальным source test.

**Gate:** `NPM RELEASE VERIFIED` только после фактически исполненного external clean-install evidence.

## 18. Official MCP Registry publish + read-back + downstream baseline

Порядок:
1. только после шага 17;
2. отдельное owner authorization на Registry publish;
3. publish exact version;
4. public Registry API read-back;
5. проверить downstream discoverability отдельно.

Ключевое понимание: Official Registry — canonical metadata/feed layer, не доказанный acquisition channel.

**Текущий статус:** npm `0.1.0` публично существует; external clean-install evidence ещё должен быть закрыт; Official MCP Registry не публиковать без отдельного разрешения.

## 19. Verified client install matrix

Не писать «работает везде».

Совместимость считается только для exact:
`client version + OS + Node/npm + LayerPorter package version`.

Три слоя проверки:
1. install/start;
2. protocol/discovery + actual tool call;
3. реальный workflow + повторная сессия.

LP-100 фиксирует текущий порядок:

### 19A — Claude Code
- exact public npm stdio install;
- actual tool invocation;
- first real workflow;
- negative localhost/private-target smoke.

### 19B — Cursor
- сначала прозрачный canonical `mcp.json`;
- actual tool invocation;
- только после PASS — install deeplink/Marketplace path.

### 19C — VS Code
- manual/gallery path;
- actual tool invocation;
- publisher/security/trust behavior;
- OS-specific sandbox limitations фиксируются отдельно.

### 19D — Claude Desktop / MCPB — CONDITIONAL
MCPB с текущим `sharp` находится в HOLD до реальной cross-platform проверки. Открытые native-module issues означают, что one-click нельзя обещать заранее.

Kill rule: если текущие клиентские версии требуют undocumented/native workaround — MCPB REJECT для Image Optimizer; npm/stdio остаётся fallback, Remote MCP — будущая альтернатива.

### 19E — ChatGPT / OpenAI
Текущий local stdio не рекламируется как ChatGPT-compatible.

Отдельные пути:
- OpenAI API Remote MCP после Remote endpoint;
- MCP-backed app / Apps SDK → review → Plugin Directory для публичного ChatGPT distribution.

**Gate Сессии 19:** минимум два client install paths реально VERIFIED до широких compatibility claims.

## 20. Downstream distribution + activation + Remote contour

Порядок определяется artifact compatibility и activation, а не престижем каталога.

### 20A — Activation assets для local release
- 3–5 готовых outcome prompts;
- short real demo;
- copy-paste install для VERIFIED clients;
- troubleshooting;
- before/after evidence;
- measurement `connect → first success → second session`.

### 20B — Remote R0 после Gate 17/19

LP-101 решение:

`mcp.layerporter.com/mcp → Cloudflare Worker → Cloudflare Container с exact shared Sharp/libvips core`.

R0:
- stateless MCP 2026-07-28;
- public bounded `analyze_url_images`;
- no OAuth до первого read-only value;
- никакого production write;
- strict SSRF/rate/byte/time guards.

Cloudflare Images binding — только parity research; нельзя ради деплоя создать второй image behavior.

### 20C — Problem-first free audit / CRO

После реально работающего R0:

`problem search → URL → free audit → quantified meaningful finding → connect → first verified action`.

Первый результат должен показывать измеримый эффект/проблему, а не «MCP connected».

SEO приоритет:
1. problem intent;
2. workflow/client intent;
3. MCP/protocol intent.

Не строить hosted audit UI до существования фактического audit runtime/output contract.

### 20D — Remote R1 OAuth

Только после evidence, что audit → connect работает:
- per-tool OAuth, а не server-wide auth по умолчанию;
- OAuth 2.1;
- RFC9728 Protected Resource Metadata;
- PKCE;
- resource/audience binding;
- short-lived tokens;
- CIMD-first;
- DCR только compatibility fallback;
- минимальный `image:optimize` scope;
- `site:write` только будущий отдельный step-up gate.

Private user bytes, batch upload и write path не входят в первый Remote MVP.

### 20E — Downstream distribution

P1:
- Glama — если source/public strategy совместима;
- PulseMCP/другие downstream Registry consumers — проверить auto-ingestion до ручной подачи;
- Smithery — только после VERIFIED Remote Streamable HTTP либо VERIFIED MCPB.

P2:
- mcp.so;
- mcpservers.org;
- relevant awesome lists;
- secondary directories.

Правила:
- никаких paid placements без qualified referral/activation evidence;
- мелкие каталоги не получают ручной ресурс раньше client activation;
- каждый channel измеряется `referral → install/connect → first success → second session`.

**Gate Сессии 4:**
- exact npm release verified externally;
- Official Registry read-back выполнен после отдельной авторизации;
- trust evidence опубликован и проверен;
- минимум 2 client install paths verified;
- есть measurement `install/connect → first successful workflow → second session`;
- Remote не создаёт второе image core;
- secondary directories не блокируют следующий продуктовый этап.

---

# Сессия 5 — Page Audit + Findings + first safe fix (21–25/30)

### 21. Minimal Page Audit Extension shell

Manifest V3, Side Panel, minimal permissions; extension не дублирует тяжёлые engines.

### 22. P0 deterministic audit

Images/page weight/network/indexability/canonical/title/meta/H1/broken resources/console/Core Web Vitals signals where measurement valid.

Если Remote R0 уже доказан, web audit и extension audit должны использовать общий finding/policy contract, а не расходящиеся правила.

### 23. Prioritization engine

`Impact × Confidence × Reuse / Cost × Complexity × Risk`.

Выход: сейчас / высокий эффект / позже / не трогать.

### 24. AI Fix Suggestions

Только после normalize/dedupe/rules. Hallucinated target/file/selector/claim отклоняется deterministic layer.

### 25. First SAFE image fix

Snapshot → patch → diff → preview → tests → before/after → accept/rollback.

No direct production write.

**Gate Сессии 5:** полный цикл работает на fixtures/pilot pages и выдаёт verified improvement без соседней регрессии.

---

# Сессия 6 — Verification, bounded agent, continuous optimization, scale decision (26–30/30)

### 26. Verification Engine

Три независимых слоя:
1. machine;
2. visual Playwright diff;
3. functional page contract.

### 27. Expanded SAFE fix library

Каждый fix type имеет:
- preconditions;
- allowed targets;
- patch strategy;
- rollback;
- verification contract;
- failure fixtures.

### 28. Bounded Agent Mode

`GOAL → AUDIT → SELECT SAFE → PLAN → PATCH → VERIFY → DECIDE`.

Ограничения: iterations/files/lines/cost/tools/permissions; full audit log.

### 29. Continuous Optimization pilot

Использовать существующий GitHub/Cloudflare contour:

`Preview → Regression → Safe Fix candidate → Verify → PR`.

Не строить новый CI/CD.

### 30. Release / measurement / scale gate

Решение принимается отдельно по:
- product module;
- fix type;
- MCP tool;
- client;
- directory/channel;
- use-case;
- local vs Remote path;
- activation entry point.

Метрики:
- Verified Improvement Rate;
- rollback / false-positive;
- audit→fix time;
- audit success rate;
- meaningful finding rate;
- install/connect completion;
- first successful workflow;
- second session / second successful workflow;
- 7d active;
- workflows/user;
- failure rate;
- latency P50/P95;
- cost per first successful workflow;
- referral/citation by source.

Решение: `SCALE / KEEP / RETEST / STOP`.

Gate: доказано повторяемое измеримое улучшение и реальное использование, а не просто наличие публикаций/листингов.

---

## 7. Параллельный growth contour после первого пригодного release

Не создавать дополнительную нумерацию. Эти действия являются подзадачами 16–20 и 30:

1. Trust/CI.
2. Install UX.
3. Canonical distribution metadata.
4. Exact client compatibility.
5. Activation assets и outcome prompt gallery.
6. Remote R0 public bounded audit — только после local release gate, без fork core.
7. Problem-first free audit UX — только после фактического R0 capability.
8. Shareable before/after — только после доказанного share behavior; сначала structured local/markdown report.
9. Remote R1 OAuth — только после audit→connect activation evidence.
10. Secondary directories / paid placement — только после attribution evidence.

## 8. Field Intelligence cadence

Перед каждой существенной реализацией повторно проверять:
- official protocol/client requirements;
- GitHub repos/issues/releases;
- real client behavior;
- security incidents/limitations;
- Reddit/forums как source of hypotheses;
- competitor behavior;
- GSC/analytics/AI Search Observatory;
- собственные activation/retention данные.

Новые claims проходят:

`HYPOTHESIS → EVIDENCE → COUNTER-EVIDENCE → RISK → COST → UPSIDE → TEST → METRIC → DECISION`.

## 9. Текущий ближайший порядок на 2026-09-13

1. Не публиковать npm повторно: `@layerporter/image-optimizer-mcp@0.1.0` уже public.
2. Дождаться/добиться фактически исполняемого LP-098 external public-package smoke; runner infrastructure failure не считать product failure.
3. Закрыть source/package equivalence + Inspector CLI + dependency audit доказательствами.
4. LP-099 Trust baseline держать готовым для следующего versioned package candidate; immutable `0.1.0` не переписывать.
5. Остановиться перед Official MCP Registry до отдельной команды владельца.
6. После release gate: Claude Code exact client smoke → Cursor → VS Code; compatibility только exact-version evidence.
7. После минимум одного устойчивого client path подготовить activation assets и измерять first success / second session.
8. Remote R0 реализовывать только как отдельный contour поверх exact shared core: Worker → Container; сначала public URL audit, без OAuth.
9. Free audit landing/CRO запускать только после существования реального Remote audit output; не строить пустую форму заранее.
10. Remote OAuth R1 — только после доказанного audit→connect signal; per-tool, minimum scopes.
11. MCPB/Smithery не ставить в критический путь из-за current `sharp` native-module risk; Smithery получает приоритет только после VERIFIED Remote path.
12. Не задерживать Page Audit / first safe fix из-за вторичных каталогов.

## 10. Связанный research

- Distribution / trust / client-install: `_internal/PAGE-OPTIMIZER-DISTRIBUTION-AND-TRUST.md`.
- Exact client compatibility: `_internal/MCP-CLIENT-COMPATIBILITY-MATRIX.md` (LP-100 / PR #249).
- Remote MCP/OAuth architecture: `_internal/MCP-REMOTE-OAUTH-ARCHITECTURE.md` (LP-101 / PR #252).
- Activation/growth funnel: `_internal/MCP-ACTIVATION-GROWTH-FUNNEL.md` (LP-102 / PR #253).
- Trust baseline: `_internal/MCP-TRUST-BASELINE.md` (LP-099 / PR #248).

Эти документы не создают отдельную продуктовую нумерацию: их решения встроены в шаги 16–20 и 30 этой дорожной карты.