# МИТ — Page Optimizer — шаг 29/30

Дата: 2026-09-10
Issue: #213

## Зафиксированное решение

Continuous Website Optimization строится как state machine дрейфа и доказательств, а не как непрерывный autonomous write loop.

Основные решения:
- lifecycle: NEW / PERSISTING / RESOLVED / REGRESSED;
- affected-count trend для PERSISTING;
- только COMPLETE audit способен менять lifecycle;
- duplicate auditId идемпотентен;
- continuous state не хранит недоверенный текст страницы;
- queue создаётся только для NEW / REGRESSED / WORSENED;
- action authority не дублируется: используется LP-089 Bounded Agent policy;
- continuous queue никогда сама не исполняет действие;
- scheduler/storage/backend/network не добавляются до отдельного runtime-решения.

## Архитектурная граница

Continuous monitoring ≠ autonomous mutation.

Реальное применение любого Safe Fix остаётся за существующим контуром:
`finding → bounded policy → safe fix → verification`.

## Риски, оставленные на будущее

- полноценный scheduler и persistence;
- site-wide crawl/URL inventory;
- контроль flaky audits и coverage completeness на больших сайтах;
- production runtime с pause/kill switch/observability;
- долгосрочная метрика false-positive/regression recurrence.

Эти пункты не должны внедряться автоматически в шаг 29 и проходят отдельный Pareto Gate.
