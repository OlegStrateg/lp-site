# LP-085 — Шаг 24/30: первый Safe Fix — изображения

Дата: 2026-09-09
Статус: PASS
Issue: #206

## Контур

`Normalized image finding → bounded fix request → image-core transform → deterministic compare → preview decision → accept/reject`

Chrome-расширение не получает Sharp, filesystem write или production write. Реальный байтовый candidate создаёт server-side `image-core`; original остаётся неизменным.

## Safe allowlist

- `oversized_image`
- `missing_image_dimensions`
- `missing_srcset`

Не входят: title/meta/H1/canonical/noindex и hero/LCP heuristic.

## Hard guards

- high-confidence finding only;
- полные rendered/intrinsic dimensions обязательны;
- `withoutEnlargement = true`;
- preserve alpha;
- never increase bytes;
- candidate создаётся отдельно;
- original buffer проверяется на неизменность;
- reject уничтожает candidate без rollback production;
- никаких arbitrary output paths;
- никаких сетевых запросов из extension runtime;
- apply-to-production отсутствует.

## Реализовано

- `packages/image-core/src/safe-fix.js`
- публичный внутренний subpath `@layerporter/image-core/safe-fix`
- `packages/image-core/tests/safe-fix.test.js`
- отдельный checklist и МИТ.

## Три независимые проверки

1. Реальный buffer → новый candidate buffer, меньший по размеру — PASS.
2. no-upscale + alpha preservation + original immutability + never-increase-bytes — PASS.
3. Chrome extension regression: permissions/network/write boundaries не расширились — PASS.

GitHub Actions:
- Image MCP Verify `34393278524` — SUCCESS;
- Page Audit Extension Verify `34393313631` — SUCCESS.

## Исследовательские основания

- Sharp `withoutEnlargement` используется как hard no-upscale guard;
- Aider/Git-подход подтверждает разнесение изменения и возможности его отбросить;
- Chrome DevTools MCP рекомендует малые детерминированные блоки и reference/metadata вместо тяжёлых payload в модельном контексте.

## Gate

`FIRST SAFE IMAGE FIX GATE = PASS`

Важно: это ещё не запись оптимизированного файла в production. На шаге 24 доказан безопасный контур создания, сравнения и принятия/отклонения candidate. Production application остаётся запрещённым до отдельного verified patch/apply слоя.