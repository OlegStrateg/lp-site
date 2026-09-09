# МИТ — Page Optimizer — Шаг 25/30

Дата: 2026-09-09
Issue: #209

## Решения

- Safe Fix считается успешным только после повторного детерминированного аудита after-state.
- Экономия байтов сама по себе не является доказанным улучшением.
- Byte-transform автоматизация разрешена только для `oversized_image`.
- `missing_image_dimensions` и `missing_srcset` остаются safe-кандидатами категории images, но требуют отдельного markup-patch контура и до него возвращают REVIEW_REQUIRED.
- Oversize threshold перепроверяется перед transform; граничное значение 2× не считается подтвержденным oversized.
- Verified Improvement Rate фиксируется как основная метрика Safe Fix.
- Original bytes не изменяются; candidate существует отдельно; reject не требует отката production.
- Никаких production writes, новых Chrome permissions, network runtime или расширения allowlist на этом шаге.

## Три обязательных способа проверки

1. Реальный Buffer transform.
2. No-regression/reversibility guards.
3. Re-audit before/after тем же deterministic rule engine.

## Историческая корректировка

Шаг 24 технически доказал безопасное создание image candidate, но шаг 25 выявил, что не каждый image finding может быть устранён байтовой трансформацией. Историю шага 24 не переписываем; ограничение автоматического transform уточнено и усилено на шаге 25.
