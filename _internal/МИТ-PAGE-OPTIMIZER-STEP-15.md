# МИТ — Page Optimizer — шаг 15/30

Дата: 2026-09-09
Статус: DONE / GATE PASS
Issue: #186 / LP-078
Ветка: `feat/LP-078-image-optimizer-mcp-core`

## Решения

1. Image MCP считается технически подтверждённым только после чистого CI-прогона с установкой зависимостей и реальным stdio startup.
2. MCP TypeScript SDK v2 использовать только через `registerTool()`. Старый `server.tool()` запрещён.
3. Формат AVIF в image-core нормализовать из Sharp metadata `heif + av1` в `avif`.
4. No-upscale guard обязан учитывать EXIF orientation 5–8.
5. WebP остаётся baseline форматом автоматической политики.
6. AVIF не становится automatic default только из-за меньшего размера: benchmark показал существенно больший encode cost.
7. Синтетический benchmark используется для инженерной проверки, но не для публичных marketing claims.
8. Публичные claims по savings/quality допускаются только после отдельного benchmark на реальном корпусе.

## Verification evidence

GitHub Actions Run ID: `34341457360`.
Commit проверенного кода: `3f1e48409f297c49c54fe0d678f29422f0d37649`.

PASS:
- image-core install;
- 17/17 image-core tests;
- deterministic benchmark;
- MCP install;
- 4/4 MCP contract tests;
- real stdio server smoke.

## Зафиксированные найденные и исправленные дефекты

- MCP v2 `server.tool` runtime failure;
- AVIF incorrectly exposed as HEIF;
- false no-upscale failure after EXIF rotation.

## Итог

`15/30 = DONE`.
`IMAGE MCP TECHNICAL GATE = PASS`.

Следующий шаг: 16/30 — публичная продуктовая страница + MCP docs + security/privacy + benchmark presentation без недоказанных claims.
