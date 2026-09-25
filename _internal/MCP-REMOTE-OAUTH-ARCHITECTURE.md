# LP-101 — Remote MCP + OAuth: архитектура без второго графического ядра

Дата: 2026-09-13  
Статус: `RESEARCH / ARCHITECTURE ONLY / BLOCKED BY LOCAL SECURITY GATE`

## 1. Цель

Remote MCP нужен для снижения install/config friction и будущего подключения удалённых MCP-клиентов. Он не заменяет local stdio и не является способом обойти незакрытый security gate локального пакета.

Ключевое правило:

`один image-core + одна policy + несколько transport/deployment adapters`.

Запрещено создавать отдельный cloud image engine с другими форматами, guards или decoder behavior.

## 2. Три независимых способа проверки

1. **Протокол** — актуальная MCP specification + официальный SDK + Inspector: discovery, tools/list, tools/call, resources/read, modern/required compatibility path.
2. **Паритет продукта и безопасности** — одинаковые fixtures local vs Remote дают одинаковые ACCEPT/REJECT, размеры, alpha, byte guards и decoder decisions.
3. **Реальный клиент/UX** — connect → first useful audit → protected action → second session; отдельно negative auth/network/decoder smokes.

## 3. P0 security prerequisite после LP-103/LP-105

Remote prototype запрещён, пока локальный security-fixed candidate не прошёл exact runtime gates.

Публичный `0.1.0` не является допустимой базой Remote:
- bundled libheif = 1.23.2;
- decoder allowlist LP-103 отсутствует;
- LP-098 byte-equivalence доказывает подлинность package, а не его security clearance.

Remote обязан наследовать LP-103 boundary:
1. `VipsForeignLoad` fail-closed;
2. input allowlist только JPEG / PNG / WebP Buffer loaders;
3. HEIF/AVIF, TIFF, GIF, SVG и другие input decoders blocked;
4. AVIF output разрешён;
5. новый input format — только отдельный security/product RETEST.

Даже после появления нового Sharp/libvips HEIF/AVIF input нельзя включать автоматически. Минимум для reconsideration: фактически bundled `libheif >=1.23.4` + свежий advisory review + exact negative tests + продуктовое решение о необходимости формата.

Связанные gates:
- LP-103 / #256 / PR #257 — decoder hardening;
- LP-104 / #258 — hosted execution blocker;
- LP-105 / #259 — public 0.1.0 containment и security release plan.

## 4. Что сохраняем и что адаптируем

### KEEP
- `packages/image-core` как единственный источник image policy;
- no-upscale/alpha/orientation/never-increase-bytes/resource guards;
- decoder allowlist;
- существующие bounded tool contracts;
- local stdio как privacy-first путь.

### ADAPT
- Remote transport;
- auth context;
- quotas/rate limits;
- shared remote artifact store;
- observability;
- deployment adapter.

### DO NOT BUILD
- второй image core;
- отдельную cloud quality policy;
- произвольный transform DSL;
- production write в первом Remote;
- отдельные client-specific forks runtime.

## 5. Целевая схема

```text
Remote MCP client
      |
      v
https://mcp.layerporter.com/mcp
      |
Cloudflare Worker — edge/control plane
  - TLS/front door
  - abuse/rate controls
  - auth discovery/validation seam
  - request IDs
  - redacted telemetry
      |
      v
Cloudflare Container — Node/Linux runtime
  - exact shared LayerPorter image-core
  - exact decoder allowlist
  - Sharp/libvips
  - MCP handlers
      |
      +--> private temporary artifact store (R2 candidate)
      |
      +--> bounded public HTTP(S) reads
```

Почему Container:
- Sharp/libvips — native runtime;
- Container позволяет переиспользовать exact Node/Linux core;
- Worker остаётся edge/control-plane;
- не нужен второй image backend.

Cloudflare Images остаётся только research-кандидатом. Использовать его можно лишь после parity benchmark, если он не меняет продуктовые/security decisions.

## 6. Remote transport

Для новой реализации:
- modern stateless MCP path;
- единый Remote endpoint `/mcp`;
- официальный SDK entrypoint актуальной спецификации;
- discovery/headers по current spec;
- legacy compatibility только там, где SDK поддерживает её штатно;
- не строить архитектуру вокруг deprecated HTTP+SSE.

Protocol session не становится хранилищем пользовательского состояния. Настоящее состояние — отдельные bounded stores.

## 7. R0 — public read-only audit

Первый Remote surface после прохождения Gate A:
- только `analyze_url_images`;
- публичные HTTP(S) URL;
- без OAuth до первого полезного результата;
- strict SSRF/DNS/redirect controls;
- byte/time/image/concurrency limits;
- rate limits;
- только static HTTP facts;
- никаких browser LCP/currentSrc/rendered-size claims;
- никакого production write.

Путь ценности:

`URL → quantified finding → evidence → предложение следующего безопасного действия`.

R0 не должен принимать приватные пользовательские image bytes.

## 8. R1 — protected optimization

Только после доказанного R0 activation:
- `optimize_url_images`;
- при необходимости bounded transform tools;
- per-tool OAuth, а не server-wide auth по умолчанию.

Первый Remote не включает:
- arbitrary private file upload;
- batch private upload;
- repo/site mutation;
- production apply;
- forms/checkout/analytics/backend changes.

## 9. OAuth

OAuth не блокирует бесплатный R0.

Для protected tools:
- OAuth 2.1;
- Protected Resource Metadata;
- Authorization Server/OIDC discovery;
- PKCE;
- resource/audience binding;
- short-lived access tokens;
- безопасный refresh lifecycle;
- CIMD-first;
- DCR только compatibility fallback.

Минимальные scopes:
- `image:optimize` — protected optimization;
- будущий `site:write` — отдельный step-up scope после Safe Patch/rollback architecture.

Не выдавать `site:write` вместе с базовым connect.

## 10. Per-tool authorization

Предпочтительный flow:
1. public `analyze_url_images` даёт value;
2. protected tool возвращает auth challenge;
3. клиент проходит OAuth;
4. повторяет вызов с минимальным scope.

Цель — сократить auth abandonment и не требовать account до доказанной ценности.

## 11. Artifact storage

Process-local temp store недостаточен для stateless Remote.

Кандидат:
- private R2;
- opaque random ID;
- MIME/bytes/SHA-256/createdAt/expiresAt;
- server-side expiry check;
- best-effort deletion;
- no public listing;
- no raw path в model-visible output;
- никакого binary/base64 в первоначальном tool text.

TTL определяется после реальных latency/second-read tests, а не копируется механически из local runtime.

## 12. Privacy boundary

Local stdio:
- обработка caller bytes локально;
- LayerPorter не получает локальные изображения.

Remote:
- URL/данные могут попадать в LayerPorter/Cloudflare infrastructure;
- temporary artifacts могут храниться server-side.

До R1 нужен отдельный Remote disclosure с фактическими:
- telemetry fields;
- retention;
- artifact TTL;
- subprocessors;
- deletion behavior;
- region/data residency только если реально гарантируется;
- training/advertising policy только если она реально зафиксирована.

Нельзя переносить local claim `file stays on your device` на Remote.

## 13. Security baseline Remote

Обязательно:
- exact LP-103 decoder allowlist;
- current dependency advisory review;
- SSRF + private/reserved/link-local blocking;
- redirect revalidation;
- credentials-in-URL rejection;
- audience/resource validation;
- no token in query;
- secret/cookie/auth redaction;
- bounded bytes/time/images/concurrency;
- rate limits;
- no arbitrary shell;
- no arbitrary filesystem path;
- no production mutation R0/R1;
- Origin validation где применимо, но не как authentication.

## 14. Observability без утечки

Можно:
- request ID;
- tool name;
- coarse status/error code;
- duration;
- byte counts;
- минимальный principal identifier при auth.

Нельзя:
- auth tokens;
- cookies;
- image bytes/base64;
- resource blobs;
- URL credentials;
- полный arbitrary query string;
- полный HTML страницы.

## 15. Deployment control plane

Cloudflare остаётся единственным production deployment control plane.

Worker + Container должны иметь:
- candidate/preview verification;
- versioned rollback point;
- согласованный release unit;
- отсутствие второго GitHub deploy controller.

Research branch не является основанием менять production.

## 16. Gate A — security-fixed local release

Remote prototype разрешается только когда выполнены все пункты:
1. LP-103 exact pinned runtime tests PASS.
2. Synced MCP tests PASS.
3. Clean pack/install candidate PASS.
4. Direct + URL decoder negative tests PASS.
5. Inspector/client resource protocol PASS.
6. Dependency/security audit PASS.
7. Security-fixed version опубликована только после отдельной owner authorization.
8. Public artifact новой версии прошёл external read-back/source-equivalence/runtime verification.

LP-098 PASS для старого `0.1.0` **не заменяет Gate A**.

## 17. Gate B — Remote read-only prototype

1. Отдельный thin transport adapter без fork core.
2. Worker front door + one Container candidate.
3. Только `analyze_url_images`.
4. Exact same decoder/network guards.
5. Inspector over HTTPS.
6. SSRF/rate/budget/security tests.
7. Local-vs-Remote fixture parity.
8. Exact remote-client test.

## 18. Gate C — activation pilot

Измеряем:
`URL audit → meaningful finding → connect → first success → second session`.

KEEP/RETEST/STOP принимается по useful outcomes, не requests/endpoint availability.

## 19. Gate D — OAuth protected optimization

Только после audit→connect evidence:
1. auth discovery;
2. CIMD interoperability;
3. PKCE/audience/resource tests;
4. per-tool challenge;
5. `image:optimize` scope;
6. private artifact store;
7. Remote privacy disclosure;
8. protected client matrix.

## 20. Gate E — future write path

Не входит в Remote MVP.

Будущий write только через:

`finding → snapshot → bounded patch → independent verify → explicit approval/policy → write → post-write verify → rollback`.

## 21. Метрики

Основные:
- audit success;
- meaningful finding rate;
- P50/P95 latency;
- connect completion;
- first successful workflow;
- audit→protected action conversion;
- second-session rate;
- 7d active;
- tool failure;
- auth abandonment;
- cost per completed useful workflow.

Secondary vanity:
- requests;
- directory views;
- Registry clicks;
- npm downloads.

## 22. Kill rules

STOP / redesign если:
- Remote требует второго image core;
- decoder/security boundary расходится с local;
- audit хуже local на одинаковых fixtures;
- auth требуется до value и ломает activation;
- protected action нельзя ограничить минимальным scope;
- binary приходится класть model-visible base64;
- p95/cost делает free audit неустойчивым;
- compatibility требует client-specific runtime forks.

## 23. Не делать сейчас

До Gate A запрещено:
- deploy `mcp.layerporter.com`;
- Cloudflare Container production release;
- OAuth provider setup;
- Remote public claims;
- ChatGPT/Plugin Directory submission;
- Official Registry change ради Remote;
- paid distribution.

## Решение LP-101

**RECOMMEND:**

`local stdio = privacy-first path`

`Remote R0 = bounded public URL audit, stateless, no OAuth`

`Remote R1 = per-tool OAuth protected optimization after activation evidence`

`Worker edge/control plane + Container with exact shared security-fixed core + private artifact store`

Remote начинается только после security-fixed local gate; он не является обходом уязвимого `0.1.0`.
