# LP-090 — чек-лист шага 29

До реализации:
- [x] Проверить актуальные паттерны continuous verification / drift detection / agent runtime control.
- [x] Не превращать continuous monitoring в постоянный autonomous write loop.
- [x] Определить минимум 3 независимых способа проверки.

Проверки результата:
1. Lifecycle: NEW → PERSISTING → RESOLVED → REGRESSED.
2. Idempotency/adversarial: duplicate audit id и incomplete/failed audit не меняют lifecycle ошибочно; неизвестные данные не расширяют action scope.
3. Safety integration: continuous слой только формирует evidence/queue; execution остаётся в Bounded Agent policy; Chrome permissions/network/write surface не расширяется.

Pareto-решение:
- состояние и reconciliation реализовать как чистые функции без storage/backend;
- не добавлять scheduler, database, queue, cron или hosted agent до появления реального runtime;
- baseline/history передаются извне, чтобы не добавлять chrome.storage permission на этом шаге.
