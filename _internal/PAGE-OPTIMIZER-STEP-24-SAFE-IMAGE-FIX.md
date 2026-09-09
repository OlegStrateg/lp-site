# LP-085 — Шаг 24/30: первый Safe Fix — изображения

Дата: 2026-09-09
Статус: IMPLEMENTATION STARTED

Архитектурное решение:

`Normalized image finding → bounded fix request → image-core transform → deterministic compare → preview decision → accept/reject`

Ключевая граница: расширение Chrome не получает Sharp, filesystem write или production write. Оно только формирует точный запрос на безопасную обработку. Реальный байтовый кандидат создаёт существующий server-side image-core.

Проверки результата минимум тремя способами:
1. функциональная: реальный input buffer → новый candidate buffer;
2. no-regression: no-upscale, alpha preservation, never-increase-bytes;
3. reversibility: original buffer не мутируется, кандидат существует отдельно и может быть отброшен без отката production.

Дополнительные правила:
- только image findings из safe-candidate allowlist;
- noindex/title/meta/canonical/H1 не проходят в этот контур;
- hero/LCP heuristic не применяется автоматически;
- target dimensions выводятся только из подтвержденных rendered/intrinsic facts;
- неизвестные/неполные evidence → review_required;
- никаких сетевых запросов из расширения;
- никаких arbitrary output paths;
- apply-to-production отсутствует.

Исследовательские основания:
- Sharp `withoutEnlargement` используется как hard no-upscale guard;
- Aider/Git-подход подтверждает необходимость разделять изменение и возможность мгновенно его отбросить/отменить;
- Chrome DevTools MCP рекомендует малые детерминированные блоки и reference/metadata вместо тяжёлых payload в модельном контексте.

Gate шага будет PASS только после реального image-core transform test и регрессионных проверок расширения.