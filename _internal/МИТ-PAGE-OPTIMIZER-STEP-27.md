# МИТ — Page Optimizer — шаг 27/30

Дата: 2026-09-09
Issue: #211

## Зафиксированные решения

1. Safe Fix allowlist расширяется не количеством правил, а только доказуемо безопасными действиями.
2. Новый разрешённый markup-preview fix: `missing_image_dimensions`.
3. `width/height` можно предлагать автоматически только при high confidence, известных intrinsic/rendered dimensions и совместимом aspect ratio.
4. Порог допустимого отличия rendered/intrinsic aspect ratio: 3%; выше → REVIEW_REQUIRED.
5. `missing_srcset` остаётся REVIEW_REQUIRED до появления подтверждённых variant URLs и source mapping.
6. `hero_lazy`, `fetchpriority` и preload не автоматизируются по hero-эвристике; нужен observed LCP и отдельная performance verification.
7. Preview patch не выполняет DOM/production write и работает только с нормализованными facts.
8. Успех подтверждается повторным запуском deterministic audit: исходный finding должен исчезнуть.
9. Byte-transform allowlist остаётся только `oversized_image`.
10. Следующий шаг 28/30 — Bounded Agent Mode; до него обязательно сохраняется запрет на расширение scope и policy boundary для недоверенного page content.
