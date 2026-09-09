# LP-086 — Шаг 25/30: Safe Fix Verification Gate

Дата: 2026-09-09
Статус: IMPLEMENTED / CI PENDING
Issue: #209

## Цель

Проверить первый Safe Fix для изображений как полный цикл:

`DETECT → SELECT → TRANSFORM → COMPARE → ACCEPT/REJECT → RE-AUDIT`

Критерий успеха — не факт создания меньшего файла, а исчезновение или подтверждённое снижение исходного finding без регрессии.

## Проверки результата

1. Функциональная: реальный image Buffer проходит transform и создаёт отдельный candidate.
2. Безопасность и обратимость: original immutable, no-upscale, alpha preservation, never-increase-bytes, target satisfied.
3. Независимая повторная проверка: тот же deterministic audit запускается на after-facts и обязан подтвердить устранение исходного finding.

## Найденная ошибка шага 24

`missing_image_dimensions` и `missing_srcset` были включены в общий safe image allowlist, но байтовая оптимизация изображения сама по себе не исправляет HTML `width/height` или `srcset`.

Это создавало риск ложного успеха: candidate мог стать меньше, а исходный finding оставался бы после повторного аудита.

Исправление:
- общий image safe-candidate allowlist сохраняет `oversized_image`, `missing_image_dimensions`, `missing_srcset`;
- byte-transform allowlist сужен до `oversized_image`;
- `missing_image_dimensions` и `missing_srcset` теперь возвращают `REVIEW_REQUIRED` до появления отдельного безопасного markup-patch контура;
- hero/LCP heuristic по-прежнему не допускается к автоматическому fix.

## Дополнительный false-positive guard

`oversized_image` может перейти в READY только если oversize threshold независимо подтверждён теми же facts, которые использует audit rule. Граница 2× сама по себе не считается oversized, потому что правило срабатывает только при `intrinsicWidth > renderedWidth * 2`.

## Verified Improvement Rate

Основная метрика:

`Verified Improvement Rate = applied fixes with resolved finding and no regression / all applied fixes`

Экономия байтов учитывается как вторичная метрика и не заменяет подтверждение устранения finding.

## Gate

PASS только если одновременно зелёные:
- image-core tests + end-to-end re-audit test;
- MCP regression / pack / clean install / stdio / server.json validation;
- extension rules/permissions/write/network regression.
