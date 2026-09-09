# LP-078 — Шаг 15/30: Verification Gate Website Image Optimizer MCP

Дата: 2026-09-09
Статус: PASS
Ветка: `feat/LP-078-image-optimizer-mcp-core`
Issue: #186 / LP-078

## Цель

Независимо доказать, что image-core и MCP-слой реально устанавливаются, тестируются и запускаются в чистом окружении, а не только выглядят корректно по исходникам.

## Метод проверки

GitHub Actions, чистый `ubuntu-24.04`, Node `22.16.0`.

Workflow:
`.github/workflows/image-mcp-verify.yml`

Финальный зелёный прогон:
- Run ID: `34341457360`
- Commit: `3f1e48409f297c49c54fe0d678f29422f0d37649`
- Conclusion: `success`

Шаги финального прогона:
1. checkout — PASS;
2. setup Node — PASS;
3. install image-core — PASS;
4. image-core tests — PASS;
5. image-core benchmark — PASS;
6. install MCP — PASS;
7. MCP contract tests — PASS;
8. real stdio server smoke — PASS.

## Что gate реально поймал

### 1. MCP v2 API

Первый runtime smoke упал с:
`TypeError: server.tool is not a function`.

Причина: в MCP TypeScript SDK v2 устаревший variadic `server.tool()` удалён.

Исправление:
`server.registerTool(name, { description, inputSchema }, callback)`.

### 2. AVIF metadata

Sharp/libvips возвращает AVIF как:
- `format: heif`;
- `compression: av1`.

Без нормализации существующий AVIF мог быть ошибочно классифицирован как неизвестный HEIF.

Исправление:
`heif + av1 → avif` внутри image-core.

### 3. EXIF orientation vs no-upscale

Для EXIF orientation 5–8 после `autoOrient()` ширина и высота меняются местами.
Старый guard сравнивал результат с неориентированными размерами и мог ложно выдавать `no-upscale guard failed`.

Исправление:
проверка no-upscale теперь сравнивает с orientation-aware исходными границами.

## Тесты

Финальный image-core suite:
- 17 тестов;
- 17 PASS;
- 0 FAIL.

Покрыто:
- inspect metadata;
- JPEG;
- PNG;
- WebP;
- AVIF;
- no-upscale;
- alpha preservation;
- never-increase-bytes;
- invalid format rejection;
- EXIF orientation;
- explicit AVIF encode;
- page-aware oversize;
- hero vs confirmed LCP;
- LCP lazy/fetchpriority;
- srcset/sizes review boundary;
- findings priority.

MCP contract suite:
- 4 теста;
- 4 PASS;
- 0 FAIL.

Проверено:
- ровно 5 Pareto tools;
- batch <= 20;
- responsive variants <= 6;
- нет production/filesystem/network side effects;
- MCP v2 split package + `registerTool()`.

## Benchmark

Синтетический deterministic fixture: `960×640`.
Все варианты дополнительно resize до `640px` по ширине.

### JPEG source — 375456 bytes
- → WebP: 79846 bytes, экономия 295610 / 78.73%, ~32 ms;
- → AVIF: 39946 bytes, экономия 335510 / 89.36%, ~234 ms.

### PNG source — 509201 bytes
- → WebP: 80452 bytes, экономия 428749 / 84.20%, ~28 ms;
- → AVIF: 42222 bytes, экономия 466979 / 91.71%, ~240 ms.

### WebP source — 185262 bytes
- → WebP: 76114 bytes, экономия 109148 / 58.92%, ~41 ms;
- → AVIF: 39074 bytes, экономия 146188 / 78.91%, ~219 ms.

### AVIF source — 151848 bytes
- → WebP: 80184 bytes, экономия 71664 / 47.19%, ~79 ms;
- → AVIF: 41803 bytes, экономия 110045 / 72.47%, ~261 ms.

## Вывод benchmark

AVIF на этом fixture даёт лучший размер, но стоит примерно в 5–8 раз дороже по времени encode, чем WebP.
Это подтверждает ранее принятую политику:
- WebP остаётся безопасным baseline;
- AVIF не выбирается автоматически без оценки реального выигрыша;
- AVIF должен иметь отдельный time/concurrency budget.

Эти цифры не являются универсальной гарантией качества или savings: fixture синтетический, нужен отдельный более широкий corpus перед коммерческими claims.

## Три независимых проверки

1. Runtime / installation: чистый GitHub Actions environment — PASS.
2. Functional guards + format matrix: 17 image-core tests — PASS.
3. MCP boundary + real stdio start: 4 contract tests + server smoke — PASS.

## Gate decision

`IMAGE MCP TECHNICAL GATE = PASS`.

Можно переходить к публичной упаковке и distribution-сессии.

До публичного коммерческого benchmark остаётся отдельная задача: реальный корпус фотографий/скриншотов/alpha/hero assets и quality comparison, чтобы не выдавать синтетический benchmark за market claim.
