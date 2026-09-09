# LP-078 — Шаг 14/30: пять Pareto MCP tools

Дата: 2026-09-09
Статус: DONE / CODED, runtime verification pending dependency install
Ветка: `feat/LP-078-image-optimizer-mcp-core`
Issue: #186 / LP-078

## Решение

Собран тонкий MCP-слой вокруг `packages/image-core` без переноса бизнес-логики в transport.

Использован актуальный MCP TypeScript SDK v2 (`@modelcontextprotocol/server`) вместо legacy `@modelcontextprotocol/sdk`.

## Ровно пять инструментов

1. `analyze_page_images`
2. `optimize_image`
3. `generate_responsive_variants`
4. `compare_image_versions`
5. `optimize_page_images`

Новые универсальные image-tools не добавлялись.

## Границы

- MCP transport не пишет в сайт или файловую систему;
- MCP transport не выполняет собственные HTTP-запросы;
- обработка изображений остаётся в `image-core`;
- batch ограничен максимум 20 элементами;
- responsive variants ограничены максимум 6 вариантами;
- production write отсутствует;
- page collector/browser runtime пока не встроен;
- вход изображения для transport первой версии — base64, а `image-core` продолжает работать с Buffer;
- бинарные данные не выводятся в текстовый ответ целиком.

## Проверки

### 1. API scope
PASS: `server.js` регистрирует ровно 5 инструментов.

### 2. Blast radius
PASS: diff шага 14 затрагивает только новый `packages/image-optimizer-mcp/**`.

### 3. Security/static contract
Добавлен тест, который проверяет отсутствие `writeFile/unlink/rename/exec/spawn/fetch/http.request` в MCP-слое и фиксирует bounded limits.

### Runtime status
Полный runtime запуск MCP пока не помечается VERIFIED, потому что ранее native dependency `sharp` не была успешно установлена в текущем временном окружении. Runtime gate переносится в техническую проверку шага 15 и должен выполняться в нормальном repo/CI окружении с установленными зависимостями.

## Pareto Gate

PASS. MCP слой остался тонким: schema/transport/adaptation, без собственного image runtime, browser engine, network fetcher или production writer.

## Следующий шаг

15/30 — benchmark и verification Image MCP: реальная установка зависимостей, запуск stdio server, fixture suite, image correctness, bytes, alpha/orientation/no-upscale, responsive output, tool-call success и performance envelope.
