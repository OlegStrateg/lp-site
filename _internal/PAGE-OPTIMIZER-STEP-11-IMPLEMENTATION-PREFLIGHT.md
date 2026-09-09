# LP-078 — Шаг 11/30: Implementation Pre-flight

Дата: 2026-09-09
Статус: DONE

## 1. Цель
Подготовить безопасный implementation-контур Website Image Optimizer MCP до первой строки runtime-кода.

## 2. Источники истины

- default branch: `master`
- master HEAD на момент pre-flight: `84bc58ec2238f2dd874cf34c3a835af290924482`
- research branch: `research/LP-077-page-optimizer-base`
- research HEAD: `5156cc07a8a5c52d6bc120963d198815d10675eb`
- implementation issue: `#186 / LP-078`
- implementation branch: `feat/LP-078-image-optimizer-mcp-core`
- recovery branch: `recovery/LP-078-pre-implementation-84bc58e`

Implementation branch намеренно базируется на актуальном `master`, а не на research branch, чтобы не потерять более свежие изменения сайта. Research остаётся доказательной базой и не является runtime-base.

## 3. Что фактически есть в репозитории

### Root runtime
- Astro 7.1.4;
- Node >=22.12;
- Cloudflare Pages/Functions;
- build/smoke/analytics/uniqueness gates.

### Текущие графические/конвертационные модули
- `src/lib/converter/*` — браузерные conversion helpers/workers;
- `src/lib/converter/webpToJpg.worker.ts` — WebP→JPG через `ImageBitmap + OffscreenCanvas`;
- PSD/PDF/ICO/PPTX отдельные узкие модули;
- responsive WebP assets уже используются в `public/images/*`.

### Критичный вывод
В репозитории нет общего серверного image processing core на Sharp/libvips.

Существующий WebP worker:
- выполняется в браузере;
- ориентирован на один conversion flow;
- не имеет серверных resource/security guards;
- не подходит как processing engine MCP.

Следовательно, Shared Graphics Core для нового серверного контура должен быть создан как отдельный Node-only слой на Sharp/libvips, не переписывая существующие client converters.

## 4. Решение по размещению

Не помещать Sharp-runtime в `src/lib/converter`, потому что этот слой участвует в браузерном продукте и может привести к случайному server/client coupling.

Предварительная структура:

```text
packages/
  image-core/
    package.json
    src/
    test/
  website-image-optimizer-mcp/   # шаги 13–14, не создавать в первом core-commit без необходимости
```

На шаге 12 создаётся только `packages/image-core`.

Root `package.json` не превращать в workspace до доказанной необходимости. Первый core должен тестироваться изолированно, чтобы не ломать текущую Astro-сборку.

## 5. Разрешённый diff шага 12

Разрешено:
- `packages/image-core/**`;
- отдельная документация LP-078 в `_internal/**`;
- минимальная root-интеграция тестовой команды только если действительно нужна и отдельно обоснована.

Не разрешено без отдельного решения:
- `src/lib/converter/**`;
- `src/components/**`;
- `src/pages/**`;
- Cloudflare production functions;
- analytics;
- checkout/forms/auth;
- текущие converter flows;
- public assets.

## 6. Первый technical scope

Шаг 12 должен реализовать только:
1. Sharp/libvips adapter;
2. metadata read;
3. resize с `withoutEnlargement`;
4. output WebP/JPEG/PNG и AVIF за policy boundary;
5. preserve alpha/orientation policy;
6. `never-increase-bytes` decision guard;
7. deterministic result schema;
8. resource limits at adapter boundary;
9. fixtures/tests.

Не реализовывать на шаге 12:
- MCP transport;
- page crawling;
- LCP detection;
- remote URL fetch;
- responsive planning;
- batch orchestration;
- AI;
- HTML patching.

## 7. Тестовый контракт шага 12

Минимум три независимые группы:

### A. Correctness
- source metadata читается корректно;
- output декодируется;
- заданный target size соблюдён;
- upscale запрещён;
- orientation нормализуется ожидаемо;
- alpha не теряется там, где format/policy обязан его сохранить.

### B. Optimization guards
- выход больше оригинала → REJECT/keep original;
- invalid format → controlled error;
- excessive dimensions/pixels → controlled reject;
- AVIF/WebP policy не меняет формат без measurable reason в auto-mode.

### C. Regression isolation
- существующий root build не требует Sharp для client bundle;
- `src/lib/converter/**` не изменён;
- текущие smoke scripts остаются независимыми.

## 8. Definition of Done шага 11

- implementation issue создан;
- отдельная implementation branch создана;
- branch синхронизирована с актуальным master;
- recovery branch создана до runtime changes;
- место нового runtime определено;
- текущий browser image code проверен и отделён от server image-core;
- allowed/forbidden diff зафиксирован;
- тестовый контракт определён;
- первая строка runtime-кода ещё не написана.

Статус: PASS.

## 9. Следующий шаг

12/30 — реализовать минимальный `packages/image-core` на Sharp/libvips строго в пределах этого pre-flight: adapter + guards + fixtures/tests, без MCP transport и без изменений существующих браузерных converter flows.
