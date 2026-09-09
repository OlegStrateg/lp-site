# МИТ — Page Optimizer — Шаг 21/30

Дата: 2026-09-09
Issue: #198

## Зафиксировано

- Page Audit Extension MVP реализуется отдельным изолированным пакетом `packages/page-audit-extension`.
- Архитектура: `Collector → Snapshot → Rules → Findings → Side Panel`.
- Только read-only режим.
- Permissions: только `activeTab`, `scripting`, `sidePanel`.
- Запрещены broad host permissions, debugger/webRequest, storage, сеть и любые изменения страницы.
- Lighthouse остаётся внешней независимой проверкой.
- axe-core и фактические CWV добавляются отдельными слоями позже.
- Hero heuristic не считается observed LCP.
- Snapshot ограничен 200 изображениями и 500 resource entries.
- Findings обязаны сохранять структуру `FACT → IMPACT → PRIORITY → FIXABILITY → VERIFICATION`.
- Шаг считается завершённым только после зелёного CI и отдельной живой проверки в Chrome перед статусом VERIFIED.
