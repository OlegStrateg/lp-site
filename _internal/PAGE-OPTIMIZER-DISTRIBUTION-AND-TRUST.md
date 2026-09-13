# LayerPorter Page Optimizer — дистрибуция, доверие, установка, активация и рост

Статус: LP-077 / усиленная исследовательская база / 2026-09-13

Этот документ заменяет исследовательскую версию от 2026-09-09 в текущей Git-линии. Он не объявляет непроверенные каналы рабочими и не превращает листинг в доказательство трафика, доверия или ранжирования.

## 1. Главная модель

MCP нельзя продвигать как «опубликовать в каталогах».

Рабочая воронка:

`ПРОБЛЕМА / ПОИСК → ОБНАРУЖЕНИЕ → ДОВЕРИЕ → УСТАНОВКА / ПОДКЛЮЧЕНИЕ → ПЕРВЫЙ УСПЕШНЫЙ РЕЗУЛЬТАТ → ВТОРАЯ СЕССИЯ → ПОВТОРНОЕ ИСПОЛЬЗОВАНИЕ / SHARE → REFERRAL / CITATION`

Разделять эффекты:

1. **DISCOVERY** — сервер можно найти.
2. **INSTALL / CONNECT** — пользователь реально может подключить его в конкретном клиенте.
3. **ACTIVATION** — пользователь получил первый законченный полезный результат.
4. **RETENTION** — вернулся и повторил сценарий.
5. **RUNTIME TRUST** — сервер реально проходит protocol/security/reliability проверки.
6. **ENTITY / CITATION** — бренд и URL появляются в независимых релевантных источниках/ответах.
7. **SEO / LINK** — индексируемое упоминание или ссылка; само наличие листинга не считать ranking factor.

Главная ошибка старой модели: смешивать `listed`, `discoverable`, `installable`, `trusted` и `used`.

## 2. Что изменилось после исследования 2026-09-13

### Official MCP Registry — канонический metadata/feed layer, не самостоятельный acquisition-канал

Official MCP Registry прямо описывает себя как централизованный репозиторий метаданных с REST API для MCP-клиентов и агрегаторов. Registry находится в preview; возможны breaking changes/data resets.

Следствие для LayerPorter:
- Registry обязателен как canonical ecosystem identity/discovery feed;
- после publish нужен внешний read-back exact version;
- отдельно проверять, появился ли сервер в downstream каталогах/клиентах;
- `PUBLISHED IN REGISTRY` не равно `DISCOVERABLE` и тем более не равно `USAGE`;
- Registry metadata должен иметь версионный regression-test.

Источник: https://modelcontextprotocol.io/registry/about

### MCP protocol 2026-07-28 меняет будущий Remote MCP

Новая спецификация 2026-07-28 вводит stateless protocol core, `server/discover`, header routing, cacheable list responses и уводит новые реализации от DCR к Client ID Metadata Documents (CIMD). Legacy HTTP+SSE и ряд старых механизмов получили deprecation path.

Следствие:
- текущий локальный stdio/npm release не переписывать ради этого;
- будущий Remote MCP проектировать под 2026-07-28;
- отдельно тестировать modern path и legacy compatibility там, где клиенты ещё не мигрировали;
- новый Remote MCP не строить вокруг deprecated SSE/DCR как целевой архитектуры.

Источник: https://blog.modelcontextprotocol.io/posts/2026-07-28/

### MCP Inspector CLI становится обязательным protocol gate

Официальный MCP Inspector имеет CLI-режим для CI и поддерживает stdio/HTTP, tools/resources/prompts, machine-readable output и modern/legacy negotiation.

Решение: после bootstrap-релиза добавить Inspector CLI как независимый protocol smoke, а не полагаться только на собственный клиентский тест.

Источники:
- https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/docs/2026-07-28/tools/inspector.mdx
- https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/docs/2026-07-28/tools/inspector/cli.mdx

## 3. Установочная матрица — не делать «одну кнопку для всех»

### P0 — npm / npx / stdio

Текущий developer fallback и уже существующая упаковка LayerPorter.

Gate:
- exact public version;
- clean install вне monorepo;
- exact tool list;
- реальный `optimize_image → resource_link → resources/read`;
- MIME / bytes / SHA-256 / dimensions / full decode;
- package/source equivalence с разрешённым release SHA.

### P0 после smoke — Cursor

Cursor поддерживает локальный stdio через `mcp.json`, Marketplace и install deeplinks `Add to Cursor`.

Решение:
- сначала реальный install smoke на текущем package;
- затем генерировать canonical Cursor config/deeplink;
- Marketplace submission только после подтверждённой работы.

Источники:
- https://cursor.com/docs/mcp
- https://cursor.com/docs/mcp/install-links

### P0/P1 после smoke — VS Code

VS Code имеет MCP server gallery и `mcp.json` install flow. Локальные MCP могут запускать произвольный код, поэтому publisher/source/security disclosure критичны.

Решение:
- проверить exact install в VS Code;
- только после этого заявлять compatibility и готовить gallery/discovery path.

Источник: https://code.visualstudio.com/docs/agent-customization/mcp-servers

### HOLD / RESEARCH — MCPB для текущего Image Optimizer

MCPB полезен как one-click local bundle, но у LayerPorter есть критическая специфика: `sharp` использует native module.

В открытых issues `modelcontextprotocol/mcpb` подтверждены риски:
- macOS library validation ломает third-party native `.node`, включая `sharp` (#229);
- ABI mismatch native modules (#180);
- дополнительные install/signing/permissions defects остаются активными.

Решение:
- MCPB не считать P0 для текущего Image Optimizer;
- не использовать undocumented workaround как production requirement;
- MCPB допускается только после реальной матрицы macOS/Windows + Claude Desktop и отсутствия хрупкого обхода;
- если native compatibility не подтверждена — REJECT для этого продукта и оставить npm/stdio либо перейти к Remote MCP.

Источники:
- https://github.com/modelcontextprotocol/mcpb/issues/229
- https://github.com/modelcontextprotocol/mcpb/issues/180

## 4. Клиенты и каталоги — обновлённая классификация

### Official MCP Registry — P0 canonical metadata

Ценность: namespace + standardized metadata + syndication API.
Метрика: exact version read-back, downstream presence, discovery.

### Cursor — P0 install/discovery client

Ценность: реальный one-click/deeplink и Marketplace.
Метрика: install completion → first successful workflow.

### VS Code — P0/P1 install/discovery client

Ценность: MCP gallery + workspace/user installation.
Метрика: install completion → first successful workflow.

### ChatGPT — отдельный app/plugin packaging path

С 2026-07-09 discovery перенесён в Plugin Directory. Apps могут быть MCP-backed; Apps SDK является рекомендуемым способом упаковки и публикации app experience. Это не «добавить URL в каталог».

Решение:
- заменить старую формулировку `ChatGPT Plugins/Apps submission` на отдельный контур `Apps SDK / MCP app → Plugin Directory review`;
- не блокировать им текущий stdio release;
- пройти отдельный product/review/privacy gate.

Источник: https://help.openai.com/en/articles/11487775

### Smithery — CONDITIONAL, не немедленный P0 для текущего stdio package

Актуальный Smithery publish path:
- remote Streamable HTTP URL; либо
- local stdio как MCPB bundle.

У текущего LayerPorter нет Remote MCP, а MCPB с `sharp` имеет неподтверждённую совместимость.

Решение: HOLD до одного из двух доказанных путей:
1. Remote Streamable HTTP; или
2. VERIFIED MCPB matrix.

Источник: https://smithery.ai/docs/build/publish

### Glama — P1 quality/discovery

Поддерживает GitHub submission, automated license/security/health checks и metadata через `glama.json`.

Решение: использовать после публичного/доступного source contour, если это соответствует лицензионной стратегии; не обещать open-source, если source остаётся proprietary.

Источник: https://glama.ai/mcp/faq

### PulseMCP / mcp.so / mcpservers.org / awesome lists — P1/P2

Использовать только если есть реальная discoverability/referral/usage value.

Правила:
- сначала проверить, не индексируют ли они Official Registry автоматически;
- не тратить ручной ресурс на дублирующий submission;
- paid listing запрещён без доказанного qualified referral/activation сигнала;
- backlink/DR сам по себе не является причиной платить.

## 5. Trust/CI — что должно стать доказательством, а не маркетинговым текстом

Минимальный слой:

1. exact source SHA / package version / package integrity;
2. clean install outside monorepo;
3. собственный full MCP smoke;
4. официальный MCP Inspector CLI smoke;
5. dependency audit + vulnerability scan;
6. `SECURITY` / `PRIVACY` / permissions & side-effects matrix;
7. client compatibility matrix: client + version + OS + install method + result;
8. deterministic limits: URL/security/bytes/time/concurrency;
9. latency P50/P95 на representative workloads;
10. failure fixtures + truthful known limitations.

Optional independent scanners использовать только после проверки их privacy/data path. Third-party badge без понятной методики не считать доказательством.

## 6. Canonical metadata layer

Нужен единый источник данных, из которого генерируются/валидируются:
- npm package metadata;
- `server.json`;
- README install/tool snippets;
- docs/product page identity;
- Cursor/VS Code configs;
- future Smithery server card;
- future `glama.json`;
- directory submission copy.

Цель: исключить рассинхрон names/version/homepage/docs/repository/privacy/tool descriptions.

Пока Official Registry находится в preview, генератор не должен жёстко зацементировать внешнюю schema: schema-version/tests должны обновляться отдельно.

## 7. Activation — продавать результат, не аббревиатуру MCP

Первый экран и directory copy должны отвечать:
- какую проблему решает;
- какой результат возвращает;
- что требуется для запуска;
- что сервер НЕ делает;
- где доказательство before/after.

P0 activation assets:
- 3–5 готовых рабочих запросов;
- короткий demo реального сценария;
- copy-paste install для проверенных клиентов;
- первый законченный workflow;
- troubleshooting по фактическим ошибкам.

Основная activation metric:
`INSTALL / CONNECT → FIRST VERIFIED SUCCESS`.

Не использовать число tool calls как главный proxy ценности.

## 8. Free audit и shareable result — только после базовой activation

Потенциальная воронка:

`URL → бесплатный аудит → quantified issues/savings → connect MCP → safe fix → before/after report`.

Это сильнее «скачайте MCP», потому что пользователь видит value до установки.

Но не строить сейчас:
- hosted audit backend;
- OAuth/paywall;
- share infrastructure.

Сначала доказать install → first success на локальном продукте.

## 9. SEO / AI discovery

Архитектура контента:

`problem page → use-case page → MCP/product page → docs → verified benchmark/research`.

Правила:
- одна страница = самостоятельный интент и работающая ценность;
- no doorway/programmatic spam;
- tool descriptions писать для точного выбора инструмента моделью, а не stuffing;
- `llms.txt` / structured docs — compatibility experiment, не ranking claim;
- AI visibility измерять отдельно по каждому engine и повторно;
- любое directory/link влияние проверять GSC/referral/AI citation before-after.

## 10. Growth analytics

Не оптимизировать downloads/stars как главную цель.

P0 воронка:
1. discovery impression / referral где доступно;
2. install/connect started;
3. install/connect completed;
4. first successful workflow;
5. second successful workflow / second session;
6. 7d active;
7. completed workflows per active user;
8. error/failure rate;
9. latency P50/P95;
10. referral/citation by channel.

Отдельно хранить vanity:
- npm downloads;
- stars;
- directory rank.

Они полезны как сигнал, но не заменяют activation/retention.

## 11. Pareto / kill rules

- Не строить 20 MCP и 50 tools до доказанного использования одного компактного MCP.
- Remote/OAuth не блокирует current stdio/npm release.
- MCPB не блокирует current release и может быть REJECTED для Image Optimizer из-за native dependency.
- Smithery не блокирует release, если нет поддерживаемого artifact path.
- Не платить за directory placement без доказанного qualified signal.
- Не заявлять client compatibility до live smoke exact client/version/OS.
- Не заявлять security/reliability/LCP improvement без evidence.
- Не расширять tool surface ради directory keywords.

## 12. Решения, обязательные для дорожной карты

Шаги 16–20 должны быть переписаны вокруг четырёх независимых gates:

1. **Trust + canonical metadata.**
2. **Exact public package + independent protocol verification.**
3. **Official Registry read-back + downstream discovery baseline.**
4. **Verified client installation/activation, затем secondary distribution.**

Финальный шаг 30 должен принимать решение SCALE / RETEST / STOP отдельно:
- по клиенту;
- по каталогу;
- по use-case;
- по acquisition channel;
- по fix type.

## 13. Evidence register 2026-09-13

| Тезис | Источник | Уровень |
|---|---|---|
| Official Registry — standardized metadata + API для clients/aggregators, preview | modelcontextprotocol.io/registry/about | OFFICIAL |
| MCP 2026-07-28: stateless core, server/discover, header routing, CIMD direction | blog.modelcontextprotocol.io/posts/2026-07-28/ | OFFICIAL |
| MCP Inspector CLI пригоден для CI | official MCP docs / inspector | OFFICIAL |
| Cursor поддерживает Marketplace, stdio config и install deeplink | cursor.com/docs/mcp | OFFICIAL |
| VS Code имеет MCP gallery | code.visualstudio.com/docs/agent-customization/mcp-servers | OFFICIAL |
| ChatGPT app discovery migrated to Plugin Directory; Apps SDK/MCP-backed apps | help.openai.com/en/articles/11487775 | OFFICIAL |
| Smithery URL path требует Streamable HTTP; local stdio — MCPB | smithery.ai/docs/build/publish | OFFICIAL VENDOR |
| MCPB + native modules/sharp имеет открытые macOS/ABI blockers | modelcontextprotocol/mcpb issues #229/#180 | FIELD EVIDENCE / OPEN ISSUE |
| Glama GitHub submission + automated checks | glama.ai/mcp/faq | VENDOR |

Forum/community claims остаются гипотезами до собственного измерения.
