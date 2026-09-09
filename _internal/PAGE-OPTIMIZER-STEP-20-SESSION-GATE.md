# LP-081 — Шаг 20/30: Session Gate перед Page Audit Extension

Дата: 2026-09-09
Статус: READY FOR PAGE AUDIT IMPLEMENTATION / EXTERNAL RELEASE STILL BLOCKED
Issue: #196

## Цель

Разделить две вещи, которые нельзя смешивать:

1. готовность продолжать продуктовую разработку Page Audit Extension;
2. готовность Website Image Optimizer MCP к внешней публичной публикации.

## Readiness matrix

| Контур | Статус | Блокирует шаг 21? | Что осталось |
|---|---|---:|---|
| image-core runtime | PASS | нет | расширять только по доказанной потребности |
| page-aware image analysis | PASS | нет | подключить реальный browser collector позже |
| MCP 5-tool surface | PASS | нет | transport не расширять без причины |
| clean tarball install | PASS | нет | публичный npm install после release |
| MCP Registry metadata validate | PASS | нет | реальная domain auth + publish |
| public product/docs pages | PASS | нет | публикация/деплой наружу отдельно |
| binary MCP response safety | FIXED + TESTED IN STEP 20 | нет | сохранять contract test |
| npm scope ownership | BLOCKED EXTERNALLY | нет | подтвердить @layerporter |
| license | BLOCKED EXTERNALLY | нет | юридически выбрать лицензию |
| domain auth com.layerporter | BLOCKED EXTERNALLY | нет | DNS/HTTP ownership setup |
| public source surface for Glama | BLOCKED EXTERNALLY | нет | dedicated public repo или hosted connector |
| Smithery MCPB | NOT BUILT | нет | после публичного release source |
| root npm run build | EXISTING DEBT | нет | .ts smoke runtime отдельно |

## Закрытый P0-долг шага 20

Старый `textResult()` полагался на replacer `JSON.stringify()` для Buffer.
Это недостаточная гарантия, потому что Buffer имеет собственный `toJSON()` и может быть преобразован до replacer.

Исправлено:

- добавлен `src/text-result.js`;
- бинарные значения санитизируются ДО `JSON.stringify()`;
- Buffer / TypedArray / ArrayBuffer превращаются только в `{ type: 'binary', byteLength }`;
- защищён также уже преобразованный `{ type: 'Buffer', data: [...] }`;
- circular object не роняет сериализацию;
- тест доказывает отсутствие `data:[...]`, исходного marker и base64-копии в MCP text response.

Это важно для:

- token/context safety;
- памяти клиента;
- предотвращения случайной передачи больших бинарных payload через текстовый канал;
- будущей массовой архитектуры, где binary вообще не должен ездить через model context.

## Что НЕ блокирует Page Audit Extension

Следующие пункты сознательно не тормозят шаг 21:

- npm публикация;
- Official MCP Registry publish;
- Glama/Smithery/mcp.so;
- лицензия внешнего пакета;
- domain auth;
- public repo split.

Причина: Page Audit Extension — отдельный продуктовый слой сбора/нормализации фактов и Findings. Он может разрабатываться и тестироваться внутри private Git до внешнего release MCP.

## Что обязательно переносится в Step 21

1. MV3 / Side Panel архитектура без широких разрешений.
2. Collector только фактов страницы, не LLM в content script.
3. Normalized Page Snapshot как стабильный контракт.
4. Deterministic Rule Engine до AI.
5. Findings schema: FACT → IMPACT → PRIORITY → FIXABILITY → VERIFICATION.
6. Extension не является authoritative Lighthouse environment.
7. Clean-profile Lighthouse/Playwright остаётся независимым verification layer.
8. SPA/soft-navigation учитывать отдельно.
9. Никаких safe-fix действий в Step 21 — только audit/read-only MVP.
10. P0 сигналы: SEO basics, images, resource weight/errors, observable CWV, deterministic accessibility.

## Открытые долги

### External release blockers

- npm `@layerporter` ownership;
- license;
- package `private:false` только после legal/account gate;
- domain auth;
- public source/connector surface;
- actual indexed listings.

### Existing site debt

Root `npm run build` падает до Astro на прямом импорте `.ts` в существующем smoke path `src/lib/converter/buildPsd.ts`.
Не связан с Page Optimizer и не маскируется.

### Commercial evidence debt

Synthetic image benchmark нельзя использовать как универсальный market claim. Нужен реальный corpus.

## Gate decision

`SESSION 2 PRODUCT DEVELOPMENT GATE = PASS`

`EXTERNAL MCP RELEASE GATE = BLOCKED`

Следующий шаг:

`21/30 — Page Audit Extension MVP`.
