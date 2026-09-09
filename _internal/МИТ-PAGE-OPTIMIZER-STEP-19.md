# МИТ — Page Optimizer — Шаг 19/30

Дата: 2026-09-09
Issue: #193 / LP-080
Ветка: `feat/LP-080-image-mcp-distribution-pack`

## Решение

Дистрибуция MCP строится по принципу качества и измеримой обнаруживаемости, а не количества каталогов.

Приоритет:

1. Official MCP Registry — канонический MCP registry.
2. Glama — независимый build/run/introspection/security/quality слой.
3. Smithery — distribution/install/analytics слой.
4. mcp.so — community discovery.
5. punkpeye/awesome-mcp-servers — developer discovery после Glama.

## Критические зависимости

- Official Registry требует фактически опубликованный package, ownership и namespace auth.
- Glama open-source flow требует публичный GitHub source surface; текущий private `layerporter-site` нельзя открывать ради каталога.
- Smithery URL publish требует Streamable HTTP; текущий server = stdio. Для local path нужен MCPB.
- mcp.so не подавать до появления рабочих публичных npm/Registry/source ссылок.
- awesome-mcp-servers теперь зависит от Glama listing + quality score/badge.

## Новые правила

- Не публиковать весь private site monorepo ради discovery.
- Не подменять stdio сервер фиктивным HTTP endpoint.
- Listing не считается DONE без отдельной проверки индексации.
- Listing не считается independent trust proof, если это простой каталог без собственного technical verification.
- Low-trust mass-directory submissions запрещены до доказательства referral/install/discovery value.

## Proof ledger

Создан:
`packages/image-optimizer-mcp/distribution/distribution-proof-ledger.json`

Обязательные состояния:
`PREPARED → SUBMITTED → INDEXED → VERIFIED`

Допустимы:
`BLOCKED / REJECTED / STALE`.

## Массовая архитектура

Повторно подтверждено:

`MCP → Job API → Queue → Workers → Object Storage → Verification DB`

Directory/distribution layer не должен влиять на runtime architecture.

## Gate

`DISTRIBUTION PREPARATION GATE = PASS`

`EXTERNAL SUBMISSION = BLOCKED` до закрытия public-release/source-surface blockers.

Следующий шаг 20/30: проверить полный distribution/session gate и подготовить переход к Page Audit MVP, не создавая ложный статус «опубликовано» там, где фактической индексации ещё нет.
