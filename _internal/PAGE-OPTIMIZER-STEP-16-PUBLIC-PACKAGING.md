# LP-078 — Шаг 16/30: публичная упаковка Website Image Optimizer MCP

Дата: 2026-09-09
Статус: DONE / PACKAGING VERIFIED, NOT YET PUBLICLY RELEASED
Ветка: `feat/LP-078-image-optimizer-mcp-core`
Issue: #186 / LP-078

## Цель

Подготовить канонический публичный технический слой продукта до регистрации в npm/MCP-каталогах:

- продуктовая страница;
- подробная документация;
- README пакета;
- security/privacy boundary;
- технические доказательства;
- точные ограничения;
- машинно-читаемый schema layer;
- MCP risk metadata.

## Созданные канонические поверхности

### Product

`/mcp/website-image-optimizer/`

Source:
- `src/pages/mcp/website-image-optimizer.astro`
- `src/copy/website-image-optimizer-mcp.md`

Покрывает:
- category/job;
- пять MCP tools;
- page-aware отличие;
- safety boundary;
- format policy;
- verified status;
- benchmark disclaimer;
- release status.

### Docs

`/docs/mcp/website-image-optimizer/`

Source:
- `src/pages/docs/mcp/website-image-optimizer.astro`
- `src/copy/website-image-optimizer-mcp-docs.md`

Покрывает:
- runtime;
- архитектуру;
- пример snapshot;
- tool contracts;
- default policy;
- privacy/security boundary;
- hosted/remote URL ограничения;
- verification evidence;
- benchmark;
- known limitations;
- release sequence.

### Package README

`packages/image-optimizer-mcp/README.md`

README намеренно не говорит, что npm/Registry release уже существует.

## Entity / SEO consistency

Зафиксированы имена:

- Brand: `LayerPorter`;
- Product: `Website Image Optimizer MCP`;
- расширенное имя: `LayerPorter Website Image Optimizer MCP`.

Canonical paths:

- `https://layerporter.com/mcp/website-image-optimizer/`
- `https://layerporter.com/docs/mcp/website-image-optimizer/`

Продуктовая страница содержит минимальный `SoftwareApplication` JSON-LD без ratings, offers, downloads и других неподтверждённых полей.

## MCP risk metadata

По актуальной MCP risk vocabulary всем пяти текущим tools добавлены annotations:

- `readOnlyHint: true`;
- `destructiveHint: false`;
- `idempotentHint: true`;
- `openWorldHint: false`.

Важно: annotations рассматриваются только как client hints. Реальная безопасность остаётся hard boundary кода и тестов.

## Что намеренно НЕ утверждается

Пока запрещено писать как факт:

- опубликовано в npm;
- опубликовано в Official MCP Registry;
- доступен hosted endpoint;
- есть retention/SLA hosted-сервиса;
- есть реальные рыночные savings X%;
- AVIF всегда лучше WebP;
- продукт автоматически пишет изменения в production.

Статус наружу до шагов 17–19:

`technical candidate`.

## Проверка 1 — MCP regression

После добавления annotations повторно прошёл workflow:

- Run ID: `34342062366`;
- conclusion: `success`;
- image-core tests: PASS;
- benchmark: PASS;
- MCP contracts: PASS;
- stdio smoke: PASS.

## Проверка 2 — Astro public pages

Создан отдельный scope-specific workflow:

`.github/workflows/page-optimizer-public-verify.yml`

Финальный Run ID:
`34342156191`

Conclusion:
`success`.

Проверено:

- `npx astro build` — PASS;
- `/mcp/website-image-optimizer/` сгенерирован — PASS;
- `/docs/mcp/website-image-optimizer/` сгенерирован — PASS;
- product identity в HTML — PASS;
- technical-candidate disclosure — PASS;
- JSON-LD presence — PASS.

## Обнаруженный существующий долг сайта

Первоначально public workflow запускал полный root `npm run build`.
Он упал ДО Astro на существующем smoke path:

`ERR_UNKNOWN_FILE_EXTENSION: .ts`

для:
`src/lib/converter/buildPsd.ts`.

Причина не связана с новыми MCP-страницами: текущий Node smoke запускает TypeScript-файл напрямую без TS runtime/transpile layer.

Решение в LP-078:
- не расширять scope;
- не маскировать проблему;
- public-page gate проверяет именно `npx astro build`;
- существующий root smoke/build debt должен быть вынесен в отдельную задачу, если он ещё не отслеживается.

## Три независимых способа проверки

1. MCP runtime/regression workflow — PASS.
2. Astro build + canonical page assertions — PASS.
3. Content/evidence audit: никаких неподтверждённых publication/hosted/market claims — PASS.

## Gate decision

`PUBLIC PACKAGING GATE = PASS`.

Но:

`PUBLIC RELEASE = NOT YET`.

Следующий шаг должен публиковать/подготавливать фактический distributable artifact и registry metadata, после чего installability проверяется уже из публичного источника, а не из private repository branch.
