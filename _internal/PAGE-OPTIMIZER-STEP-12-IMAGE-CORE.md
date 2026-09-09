# LP-078 — Шаг 12/30: минимальный серверный image-core

Дата: 2026-09-09
Статус: DONE / CODED, runtime test pending dependency install in CI/local repo
Ветка: `feat/LP-078-image-optimizer-mcp-core`
Issue: #186 / LP-078

## Что реализовано

Создан изолированный пакет `packages/image-core` без изменения существующего сайта и браузерных конвертеров.

Состав:
- `package.json` — отдельная зависимость `sharp@0.35.4`, без перевода корня в workspace;
- `src/policy.js` — allowlist форматов и детерминированная policy;
- `src/index.js` — `inspectImage` и `optimizeImage`;
- `tests/core.test.js` — guard-тесты;
- `README.md` — границы пакета и контракт первой версии.

## Архитектурные решения

1. Вход первого этапа только `Buffer`.
2. Сетевой fetch, filesystem writer, MCP transport и page audit отсутствуют.
3. Sharp options наружу не прокидываются произвольно.
4. Разрешены только JPEG / PNG / WebP / AVIF.
5. `auto` пока не выбирает AVIF автоматически: AVIF policy допускается только после benchmark шага 15.
6. JPEG/PNG в `auto` получают WebP как baseline-кандидат.
7. WebP/AVIF сохраняют текущий формат, если пользователь явно не выбрал другое.

## Guards

- `withoutEnlargement=true` по умолчанию;
- hard check, что output dimensions не превысили original;
- `preserveAlpha=true` по умолчанию;
- forced JPEG для alpha input при preserveAlpha блокируется;
- output alpha проверяется повторным metadata-read;
- EXIF orientation нормализуется через `autoOrient()`;
- ICC profile сохраняется через `keepIccProfile()`;
- `neverIncreaseBytes=true`: если candidate >= original, статус `REJECT`, а возвращаемый рабочий buffer остаётся исходным;
- max width/height и decoded pixel limit;
- invalid format отклоняется до encode.

## Проверки

### 1. Изоляция diff — PASS
`master...feat/LP-078-image-optimizer-mcp-core`:
- implementation branch ahead by 7;
- behind by 0;
- изменены только документы pre-flight и `packages/image-core/**`;
- `src/lib/converter/**`, страницы, функции сайта и production config не изменены.

### 2. Синтаксис — PASS
Локальный воспроизводимый стенд:
- `node --check src/index.js` — PASS;
- `node --check src/policy.js` — PASS;
- `node --check tests/core.test.js` — PASS.

### 3. Runtime guard tests — NOT VERIFIED YET
Попытка установить `sharp@0.35.4` во временном окружении дважды упёрлась в timeout установки зависимости. Первый `npm test` после незавершённой установки корректно упал на `ERR_MODULE_NOT_FOUND: sharp`.

Это НЕ считается ошибкой image-core и НЕ считается PASS тестов. Полный runtime gate переносится в репозиторный/CI прогон после доступной установки native package.

## Что намеренно не сделано

- URL fetch / SSRF boundary;
- batch queue;
- responsive variants;
- page context;
- MCP server;
- hosted transport;
- root dependency changes;
- root package-lock changes;
- production write.

## Pareto Gate

PASS: минимальный общий серверный слой создан без дублирования кодеков и без смешивания транспортного/страничного контуров.

## Следующий шаг

13/30 — page-aware analysis: rendered/intrinsic dimensions, current format/bytes, oversize ratio, srcset/sizes/loading/dimensions и LCP/hero evidence там, где его можно получить надёжно. До этого шага runtime guard tests остаются обязательным незакрытым техническим пунктом и должны быть повторены в реальном install/CI окружении.
