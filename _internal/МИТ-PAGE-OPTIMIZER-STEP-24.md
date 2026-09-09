# МИТ — Шаг 24/30

Дата: 2026-09-09

Решение: первый Safe Fix ограничен изображениями и не пишет изменения в production.

Контур: finding → bounded request → server image-core → candidate → deterministic compare → preview → accept/reject.

Запрещено: Sharp в расширении, filesystem write, arbitrary output path, network fetch из extension runtime, автоматическое применение HTML/CSS/SEO изменений, использование hero heuristic как подтвержденного LCP.

Оригинал изображения неизменяем; кандидат создаётся отдельно. Любой reject означает простое уничтожение candidate без rollback production.

Перед Gate обязательны: реальный transform test, no-regression guards, extension permissions regression.