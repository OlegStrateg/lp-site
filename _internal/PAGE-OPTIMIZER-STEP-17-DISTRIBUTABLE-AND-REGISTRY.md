# LP-078 — Шаг 17/30: distributable + npm/MCP Registry readiness

Дата: 2026-09-09
Статус: DONE / ARTIFACT VERIFIED / PUBLIC RELEASE NOT YET
Ветка: `feat/LP-078-image-optimizer-mcp-core`
Issue: #186 / LP-078

## Цель

Подготовить Website Image Optimizer MCP как реально устанавливаемый артефакт и проверить metadata для Official MCP Registry до внешней публикации.

## Оптимизация архитектуры упаковки

Отдельный публичный пакет `@layerporter/image-core` сейчас не создаётся.
Это увеличило бы поверхность публикации и требовало бы синхронного versioning двух npm-пакетов.

Вместо этого:
- единственный source of truth остаётся `packages/image-core/src`;
- перед `npm pack` скрипт `scripts/sync-image-core.mjs` генерирует копию core внутри MCP package;
- generated copy не коммитится и добавлена в `.gitignore`;
- runtime package зависит от `sharp` напрямую;
- это не создаёт второго поддерживаемого image engine.

## Package contract

Package candidate:
`@layerporter/image-optimizer-mcp@0.1.0`

Bin:
`layerporter-image-optimizer-mcp`

Runtime:
- Node >=22.12.0;
- stdio MCP;
- MCP SDK v2;
- Sharp 0.35.4.

Пока `private: true` оставлен намеренно: этот шаг не должен случайно публиковать package до решения по лицензии, npm ownership и release credentials.

License status:
`UNLICENSED`.

Это не финальная коммерческая лицензия, а защита от несанкционированного публичного release до отдельного решения.

## Official MCP Registry metadata

Создан:
`packages/image-optimizer-mcp/server.json`

Registry candidate name:
`com.layerporter/website-image-optimizer`

Package:
`@layerporter/image-optimizer-mcp@0.1.0`

Transport:
`stdio`.

Название `com.layerporter/*` предполагает domain authentication через layerporter.com при фактической публикации. Владение/настройка DNS auth в этом шаге не выдаются за проверенные.

## Актуальная официальная схема публикации

По Official MCP Registry на 2026-09-09:
- `mcp-publisher validate` валидирует `server.json` без публикации;
- actual publish требует namespace authentication;
- npm-based local server сначала публикуется в npm, затем Registry проверяет ownership package;
- GitHub Actions может использовать GitHub OIDC, PAT или DNS/HTTP authentication;
- registry рекомендует защищённые environments/required reviewers для publish credentials.

## Verification workflow

Workflow:
`.github/workflows/image-mcp-verify.yml`

Run ID:
`34342840760`

Проверено в чистом GitHub Actions environment:
1. image-core install — PASS;
2. image-core tests — PASS;
3. image-core benchmark — PASS;
4. MCP dependency install — PASS;
5. generated shared-core sync — PASS;
6. MCP contract tests — PASS;
7. source stdio smoke — PASS;
8. `npm pack` distributable tarball — PASS;
9. tarball install в чистую директорию — PASS;
10. bin executable существует — PASS;
11. packed stdio server стартует — PASS;
12. `mcp-publisher validate server.json` — PASS.

## Что пока не сделано

Не утверждать как факт:
- npm package опубликован;
- npm scope `@layerporter` подтверждён;
- package доступен через npx из публичного registry;
- server опубликован в Official MCP Registry;
- DNS authentication layerporter.com настроена;
- license выбрана;
- public GitHub repository существует для этого MCP.

## Массовая обработка — зафиксированный будущий контур

Не реализуется сейчас, но архитектура обязана поддержать:

`MCP → Job API → Queue → Workers → Object Storage → Verification DB`

Обязательные свойства будущего mass mode:
- resumable jobs;
- дедупликация по hash;
- idempotency;
- bounded concurrency;
- отдельные CPU/time budgets для WebP и AVIF;
- priority для LCP/hero/тяжёлых assets;
- retry по item, без падения всего batch;
- cached results;
- progress/status API;
- evidence before/after по каждому asset;
- горизонтальное масштабирование workers.

MCP batch limit 20 остаётся интерактивным boundary и не должен становиться mass-processing transport.

## Gate

`DISTRIBUTABLE ARTIFACT = PASS`

`OFFICIAL MCP METADATA VALIDATION = PASS`

`PUBLIC NPM RELEASE = NOT YET`

`OFFICIAL MCP REGISTRY RELEASE = NOT YET`

Следующий шаг: подготовить release contract / actual publication prerequisites, а затем после появления публичного package переходить к сильным MCP directories. Не публиковать фиктивные карточки до реальной installability.
