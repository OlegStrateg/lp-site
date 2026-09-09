# МИТ — PAGE OPTIMIZER — Шаг 17/30

Дата: 2026-09-09
Статус: DONE

## Решения

1. Website Image Optimizer MCP упаковывается одним distributable npm package, без отдельной публичной публикации `image-core` на этом этапе.
2. `packages/image-core/src` остаётся единственным source of truth; при `npm pack` core генерируется внутрь MCP package и не коммитится.
3. Package candidate: `@layerporter/image-optimizer-mcp@0.1.0`, bin `layerporter-image-optimizer-mcp`.
4. Пока сохраняется `private: true` и `UNLICENSED`, чтобы исключить случайный release до решения по npm ownership/license/credentials.
5. Registry candidate: `com.layerporter/website-image-optimizer`, stdio, metadata в `packages/image-optimizer-mcp/server.json`.
6. `mcp-publisher validate` обязателен до publication.
7. Массовый режим в будущем обязан идти через `Job API → Queue → Workers → Storage → Verification DB`; интерактивный MCP batch<=20 не использовать как mass-processing transport.
8. Для mass mode обязательны resumability, hash dedupe, idempotency, bounded concurrency, retry per item, cache, progress, per-asset evidence и отдельный AVIF compute budget.

## Проверка

GitHub Actions Run `34342840760`:
- source runtime — PASS;
- npm pack — PASS;
- clean tarball install — PASS;
- packed bin start — PASS;
- Official MCP `server.json` validation — PASS.

## Статусы

- Distributable artifact: PASS.
- Registry metadata validation: PASS.
- npm published: NO / NOT YET.
- Official MCP Registry published: NO / NOT YET.

Нельзя менять эти статусы на published без фактической проверки публичного npm URL / install и Registry entry.
