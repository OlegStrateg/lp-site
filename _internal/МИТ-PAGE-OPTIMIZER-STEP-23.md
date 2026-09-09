# МИТ — Page Optimizer — Шаг 23/30

Дата: 2026-09-09
Issue: #202

## Решения

- ИИ получает один нормализованный work item, а не весь DOM/снимок страницы.
- Evidence ограничен тремя примерами; длинные строки обрезаются до фиксированного лимита.
- ИИ на шаге 23 только предлагает исправление. Никаких изменений страницы/файлов/production.
- Ответ модели допускается только по строгому structured contract и проходит детерминированную валидацию.
- `safe-candidate` не равен `safe-to-apply`.
- Title/meta/H1/canonical/noindex и hero-LCP heuristic всегда `review_required`.
- Low-confidence findings блокируются до дополнительного подтверждения.
- API keys нельзя хранить в Chrome extension. Реальный inference должен подключаться через отдельный защищённый backend/runtime слой.
- На шаге 23 не добавляем network permissions, fetch, host permissions или автономный агентский цикл.
- Side Panel показывает только readiness recommendation layer, не имитирует фактический вызов модели.

## Следующий шаг

24/30 — первый Safe Fix: изображения. Только заранее разрешённые преобразования с preview, before/after evidence и rollback boundary.
