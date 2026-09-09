# МИТ — PAGE OPTIMIZER — ШАГ 9/30

Дата: 2026-09-09
Статус: DONE
Ветка: `research/LP-077-page-optimizer-base`
Issue: #182 / LP-077

## Что сделано

Зафиксирована продуктовая спецификация первого коммерческого модуля LayerPorter Page Optimizer — Website Image Optimizer MCP.

## Главная продуктовая позиция

Не строить очередной generic image optimizer.

Ключевой контур:
`PAGE CONTEXT → IMAGE FINDINGS → POLICY → OPTIMIZED VARIANTS → MARKUP RECOMMENDATION → BEFORE/AFTER EVIDENCE`.

## P0 tools

1. `analyze_website_images`.
2. `optimize_image_for_website`.
3. `generate_responsive_image_set`.
4. `compare_image_versions`.
5. `optimize_page_images` как bounded orchestration P0.5.

## Architectural decisions

- Sharp/libvips — processing core.
- Local stdio сначала, hosted Streamable HTTP поверх того же ядра.
- WebP = baseline candidate; AVIF только по policy/benchmark.
- never-increase-bytes guard обязателен.
- no-upscale / alpha / orientation / color guards обязательны.
- remote URLs проходят SSRF/private IP/redirect/byte/pixel/type/time/concurrency security boundary.
- AI не управляет низкоуровневой обработкой; deterministic policy first.
- MCP не имеет права напрямую менять production/site source.

## Что сознательно исключено из MVP

- watermark;
- generic crop/editor;
- filters;
- favicon/QR;
- CDN;
- hosting platform;
- arbitrary transform DSL;
- arbitrary filesystem write hosted mode;
- billing/accounts до доказанной usage value.

## Definition of Done

Коммерческая v1 готова только после page-aware analysis, Sharp guards, responsive generation, benchmark policy, remote URL security tests, bounded queue, local npm/stdio, hosted resource limits и before/after evidence.

## Проверки

1. Technical: существующие MCP подтверждают commodity single-image optimization.
2. Field: реальные боли сосредоточены вокруг oversized/responsive/LCP/context, а не вокруг количества эффектов.
3. Pareto: custom development оставлен только для page context, policy, security, guards, responsive planning и evidence.

## Git

Product spec commit: `ead6f3e896f71c17f2933dd95edefdec2d8e6292`.

## Следующий шаг

10/30 — Session-2 Gate: собрать distribution + baseline visibility + trust/entity + Product Spec в единый launch contract и решить, можно ли переходить к implementation contour 11/30 без дополнительного research.
