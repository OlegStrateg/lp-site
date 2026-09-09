# LP-082 — Шаг 21/30: Page Audit Extension MVP

Дата: 2026-09-09
Статус: IMPLEMENTED / CI PENDING
Issue: #198

## Цель

Собрать минимальный read-only Chrome MV3 контур:

`Content Collector → Normalized Page Snapshot → Deterministic Rule Engine → Prioritized Findings → Side Panel`

Без исправлений страницы, LLM и production writes.

## Оптимизационный обзор перед реализацией

Проверено:
- Chrome Extensions Side Panel API / Manifest V3 — использовать официальный Side Panel + activeTab/scripting, не строить собственное окно/инъекционный интерфейс;
- Lighthouse CI — оставить внешним независимым clean-profile reference, не запускать Lighthouse внутри расширения;
- web-vitals/PerformanceObserver — актуальный слой фактических CWV добавить после базового snapshot, не смешивать hero heuristic с observed LCP;
- axe-core — зрелый детерминированный accessibility engine; подключать отдельным слоем позже, а не переписывать правила доступности;
- собственный generic crawler/browser не нужен.

## Permissions

Только:
- `activeTab`
- `scripting`
- `sidePanel`

Нет:
- `<all_urls>`
- `host_permissions`
- `content_scripts`
- `webRequest`
- `debugger`
- `storage`
- сетевых запросов.

## Snapshot v1

Собирается по текущей вкладке после явного действия пользователя:
- URL;
- viewport + DPR;
- title;
- meta description;
- canonical;
- H1 count/text;
- robots/noindex;
- до 200 изображений: currentSrc, alt, intrinsic/rendered dimensions, width/height attrs, loading, fetchpriority, srcset, sizes, likelyHero heuristic;
- до 500 Resource Timing entries;
- counts scripts/stylesheets/links.

## Findings v1

Детерминированные правила:
- missing title;
- missing meta description;
- missing H1;
- multiple H1;
- missing canonical;
- noindex;
- oversized image;
- missing image dimensions;
- missing srcset for large image;
- likely hero + lazy loading.

Каждый finding имеет:
`FACT → IMPACT → PRIORITY → FIXABILITY → VERIFICATION`.

Hero heuristic не называется observed LCP. Для такого finding verification требует подтвердить actual LCP отдельным performance run.

## Side Panel

Показывает:
- кнопку Run audit;
- итог по severity;
- отсортированные findings;
- fact/impact/fixability/verification;
- раскрываемый normalized snapshot.

## Ограничения MVP

- не является Lighthouse;
- не является field CWV;
- не заявляет полный WCAG audit;
- не ловит все network/console errors;
- не меняет DOM;
- не сохраняет данные;
- не отправляет данные наружу;
- не запускает AI.

## Проверки

1. Unit rules tests.
2. Manifest static contract: MV3 + exact minimal permissions + no host permissions/content scripts.
3. CI rejects broad/write/network primitives and проверяет наличие необходимых extension files.

После зелёного CI статус шага меняется на PASS.
