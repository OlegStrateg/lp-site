# LP-090 — Шаг 29/30: Continuous Website Optimization

Дата: 2026-09-10
Статус: PASS
Issue: #213
CI: GitHub Actions 34411303946 — SUCCESS

## Цель

Добавить непрерывный контур повторной проверки без превращения продукта в бесконтрольного автономного агента.

Контракт:

`AUDIT → RECONCILE → CLASSIFY DRIFT → BUILD REVIEW QUEUE → BOUNDED AGENT GATE → VERIFY`

Сам continuous-слой ничего не применяет.

## Оптимизационный аудит

Проверены текущие практики continuous verification, drift detection и agent governance.

Выводы:
- Lighthouse CI подтверждает ценность baseline/regression comparison и истории измерений;
- continuous verification должна отличать повторное состояние от нового drift;
- долгоживущая автономность увеличивает накопительный риск, поэтому policy/runtime control важнее prompt-level правил;
- monitoring/reporting слой не должен автоматически получать write-полномочия.

Pareto-решение: на этом шаге реализовать чистую state machine без scheduler, database, queue service, chrome.storage или hosted runtime. Это сохраняет проверяемость и не создаёт инфраструктуру до появления реального production-кейса.

## Lifecycle

Каждый нормализованный work item классифицируется относительно прошлого подтверждённого COMPLETE-аудита:

- `NEW` — раньше не наблюдался;
- `PERSISTING` — был активен и остаётся активен;
- `RESOLVED` — был активен, но отсутствует в новом COMPLETE-аудите;
- `REGRESSED` — ранее был RESOLVED и появился снова.

Для `PERSISTING` дополнительно считается affected-count trend:
- `IMPROVED`;
- `UNCHANGED`;
- `WORSENED`.

## Критический false-resolved guard

Failed/incomplete audit не может менять lifecycle.

Если `auditStatus !== COMPLETE`, результат `INCONCLUSIVE_RUN`, а прошлое состояние возвращается без изменений. Это запрещает трактовать сетевой/collector/runtime сбой как «все findings исправлены».

## Идемпотентность

Последние auditId хранятся в bounded history. Повтор уже применённого auditId возвращает `DUPLICATE_RUN` и не меняет state.

Это исключает повторное создание NEW/REGRESSED событий при retry/replay.

## Хранимые данные

Continuous state намеренно хранит только компактные структурированные факты:
- ruleId/scope;
- severity/confidence/priority;
- affected counts;
- first/last seen timestamps;
- resolved timestamp;
- recurrence count;
- lifecycle classification.

Текст страницы (`fact`, evidence text) в history не сохраняется. Это уменьшает контекст/хранилище и не превращает недоверенный page content в долгоживущую управляющую память.

## Review queue

Queue формируется только для:
- NEW;
- REGRESSED;
- PERSISTING + WORSENED.

Даже такой item не получает права на исполнение.

Для точного evidence target вызывается существующий LP-089 `compileBoundedAction()`; continuous слой не содержит собственной action allowlist и не может расширить её.

Каждый queue item имеет:
- `executionAllowed: false`;
- `requiresBoundedAgentGate: true`.

## Что намеренно НЕ реализовано

- scheduler/cron;
- backend persistence/database;
- chrome.storage;
- сеть;
- production writes;
- hosted AI;
- автоматический запуск Bounded Agent;
- crawling всего сайта.

Текущий контур классифицирует последовательность уже полученных аудитов. Реальное периодическое выполнение и хранение будут отдельной runtime-инфраструктурой после финального Pareto Gate.

## Проверки

1. Lifecycle: NEW → PERSISTING(IMPROVED) → RESOLVED → REGRESSED — PASS.
2. Idempotency: duplicate auditId не мутирует state — PASS.
3. Failure guard: FAILED audit с пустым findings не создаёт ложный RESOLVED — PASS.
4. Security: malicious page text не сохраняется в continuous state/queue и не влияет на action authorization — PASS.
5. Authority: unsupported SEO/hero rules блокируются существующим Bounded Agent policy — PASS.
6. Queue discipline: unchanged persistent finding повторно не ставится в очередь; worsened — ставится для review — PASS.
7. Chrome regression: новые permissions/network/write/unsafe HTML primitives не добавляются — PASS.
8. GitHub Actions 34411303946 — SUCCESS.

## Gate

`CONTINUOUS WEBSITE OPTIMIZATION GATE = PASS`

Сохранены обязательные инварианты:
- `autoExecute = false`;
- `productionWrite = false`;
- `pageContentCanAuthorizeActions = false`;
- новых Chrome permissions/network/storage нет.
