# МИТ — LayerPorter Page Optimizer — шаг 13/30

Дата: 2026-09-09
Статус: DONE / CODED
Issue: #186 / LP-078
Ветка: `feat/LP-078-image-optimizer-mcp-core`

## Решение

Page-aware analysis реализуется как чистый детерминированный слой поверх нормализованного browser snapshot. Browser/Playwright не входят в `packages/image-core`.

## Почему

- не связываем processing core с браузерным рантаймом;
- сохраняем повторное использование из MCP/расширения/CI;
- отделяем сбор evidence от правил интерпретации;
- уменьшаем контекст и стоимость будущего ИИ;
- легче тестировать false positives.

## Зафиксированные правила

- oversize считается с учётом DPR;
- hero ≠ LCP;
- LCP-specific recommendations только по подтверждённому evidence;
- ambiguous layout inference переводится в REVIEW;
- SAFE findings должны иметь deterministic verification method.

## Реализованные Findings

`oversized_image`, `missing_srcset`, `missing_sizes`, `missing_dimension_attributes`, `lcp_lazy_loaded`, `lcp_missing_fetchpriority`.

## Проверки

- diff isolation: PASS;
- evidence boundary fixtures: PASS;
- SAFE/REVIEW boundary fixtures: PASS;
- full Sharp runtime suite: переносится в gate 15/30, так как native dependency install в текущем временном окружении ранее не был подтверждён.

## Следующий шаг

14/30 — MCP tool layer.
