# LP-077 — Шаг 3/30: Page Audit Extension

Дата: 2026-09-09
Статус: DONE

## Цель
Собрать минимальную архитектуру расширения-аудитора, которая даёт точные факты по открытой странице, не дублирует зрелые движки и не загрязняет эталонное измерение производительности самим расширением.

## Референсы и решения

### Lighthouse / Lighthouse CI — KEEP
Использовать как независимый lab-бенчмарк и regression gate.

Ключевые ограничения:
- Lighthouse сам предупреждает о вариативности результатов; нужны повторные прогоны в одинаковых условиях.
- Расширения Chrome могут влиять на производительность страницы; reference-run выполнять в чистом профиле/incognito/headless окружении без нашего расширения.
- Lighthouse score не равен бизнес-метрике и не должен быть единственным приоритетом.

### web-vitals + PerformanceObserver — KEEP
Роль:
- runtime LCP/CLS/INP signals;
- attribution;
- soft-navigation awareness.

Для SPA учитывать soft navigations и navigationId; не присваивать все события первоначальному URL.

### axe-core — KEEP
Роль: deterministic accessibility checks.

Ограничение: автоматический a11y audit не является полным WCAG-аудитом. Uncertain/manual checks нельзя маркировать как PASS.

### Chrome Manifest V3 / Side Panel / scripting — KEEP
UI-паттерн: Side Panel рядом с открытой страницей.

Правило permissions:
- минимальный scope;
- доступ к странице по пользовательскому действию или точечно нужному origin;
- не просить широкие host permissions без доказанной необходимости;
- тяжёлые расчёты не выполнять в UI-потоке Side Panel.

### Performance / Resource / Navigation Timing — KEEP
Использовать для фактического снимка страницы: ресурсы, размеры, timing, navigation signals.

### plainsignal/seo-auditor — STUDY
Факты:
- Chrome Extension;
- Apache-2.0;
- небольшой проект, 4 stars / 2 forks;
- last push 2025-07-26.

Вывод:
- полезен как checklist/taxonomy reference;
- не является зрелой базой продукта;
- checklist не moat.

## Каноническая архитектура MVP

`Content Collector → Normalized Page Snapshot → Deterministic Rule Engine → Prioritized Findings → Side Panel`

Независимый канал проверки:

`Clean browser profile / headless → Lighthouse + Playwright → Reference metrics`

## Что собираем внутри расширения

P0:
- title / meta description / H1 / canonical / robots/indexability signals;
- DOM structure and key selectors;
- image intrinsic vs rendered dimensions;
- image format / bytes where available;
- lazy loading / srcset / sizes / width / height;
- candidate LCP/hero image context;
- network resource weight;
- broken resources;
- console/runtime errors;
- render-blocking/high-cost JS/CSS signals;
- observable LCP/CLS/INP runtime signals;
- deterministic critical accessibility failures.

P1 later:
- fonts;
- schema depth;
- internal linking quality;
- broader accessibility/manual checks;
- crawl-level duplication.

## Что запрещено считать точным только по данным расширения

- эталонный Lighthouse performance score;
- стабильное сравнение before/after без чистого окружения;
- полное WCAG соответствие;
- field Core Web Vitals всей аудитории по одной локальной сессии;
- SEO ranking impact как факт.

## Что не пишем с нуля

- Lighthouse clone;
- собственный performance scoring engine;
- собственный WCAG engine;
- browser profiler;
- trace viewer;
- crawler для MVP.

## Три проверки

1. Accuracy — факт/метрика/гипотеза хранятся раздельно.
2. Non-interference — reference performance measurement выполняется отдельно от установленного аудитора.
3. Permissions — минимальный MV3 permission surface.

## Pareto Gate

В первый аудитор попадает только проверка, которая:
- ведёт к измеримому impact;
- может быть доказана;
- связана с будущим safe fix;
- не требует тяжёлого нового движка.

## Решение шага 3

Главное конкурентное преимущество не в количестве проверок, а в цепочке:
`FACT → IMPACT → PRIORITY → FIXABILITY → VERIFICATION`.

Следующий шаг: 4/30 — Safe Patch + Verification + Agent Loop.