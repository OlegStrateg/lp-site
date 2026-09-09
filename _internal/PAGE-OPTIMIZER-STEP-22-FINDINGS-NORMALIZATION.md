# LP-083 — Шаг 22/30: нормализация и приоритизация Findings

Дата: 2026-09-09
Статус: IMPLEMENTED / CI VERIFYING
Issue: #200

## Цель

Превратить сырые находки расширения в короткий список реальных работ:

`RAW FINDINGS → NORMALIZE → GROUP → SCORE → PRIORITIZE → RENDER`

Без LLM и без искусственного общего health score сайта.

## Исследовательский вывод

Полезные паттерны из зрелых аудиторов:
- severity и категория должны быть отдельными измерениями;
- повторяющиеся находки одного типа нужно группировать как одну работу с affected count;
- масштаб проблемы влияет на порядок, но не должен превращать MEDIUM в более важный класс, чем HIGH;
- эвристические сигналы нельзя приравнивать к подтверждённым фактам;
- отчёт должен начинаться с работ, а не с длинного списка экземпляров.

## Нормализованная схема

Каждый work item содержит:
- `ruleId`;
- `category`;
- `scope`;
- `severity`;
- `confidence`;
- `title`;
- `fact`;
- `impact`;
- `fixability`;
- `verification`;
- `affectedCount`;
- `evidence` — максимум 5 примеров;
- `priorityScore`.

## Категории

- `indexability`
- `seo`
- `images`
- `performance`
- `other`

Категория отвечает на вопрос «где проблема», severity — «насколько серьёзно», confidence — «насколько доказан факт».

## Confidence

- `high` — прямой детерминированный факт из DOM/snapshot;
- `medium` — сильная эвристика, требующая подтверждения;
- `low` — резерв для слабых/неполных сигналов.

`hero_lazy` намеренно получает `medium`, потому что likelyHero не является observed LCP.

## Дедупликация

Page-level rules остаются отдельными work items.

Повторяющиеся element-level rules группируются по `ruleId`:
- 80 изображений без dimensions → одна задача `missing_image_dimensions`, `affectedCount=80`;
- в UI показывается максимум 5 примеров evidence;
- полный масштаб не теряется.

## Формула приоритета

Severity base:
- critical = 100
- high = 70
- medium = 40
- low = 20

Confidence multiplier:
- high = 1.0
- medium = 0.8
- low = 0.6

Scale bonus:
- 1 instance = 0
- 2–4 = +5
- 5–19 = +10
- 20+ = +15

`priority = round(severityBase × confidenceMultiplier + scaleBonus)`

Принципиально: scale bonus ограничен 15, поэтому массовая MEDIUM-проблема не перепрыгивает подтверждённую HIGH-проблему только за счёт количества.

## Почему fixability не включена в impact score

Fixability — это характеристика действия, а не серьёзности проблемы.

`safe-candidate` может быть проще исправить, но это не делает проблему объективно более вредной. Поэтому fixability отображается отдельно и будет использоваться на следующих шагах выбора автоматизируемых исправлений.

## Side Panel

Теперь показывает:
- количество work items;
- количество affected instances;
- severity counts;
- priority score;
- confidence;
- category;
- affected evidence в раскрываемом блоке.

## Проверки

1. Агрегация повторяющихся element findings.
2. Page-level findings не склеиваются.
3. Hero heuristic имеет medium confidence и ранжируется ниже подтверждённой HIGH-находки.
4. Масштаб повышает порядок внутри класса, но не ломает severity hierarchy.
5. Manifest permissions остаются неизменными.
6. CI продолжает запрещать broad/write/network primitives.

## Gate

После зелёного GitHub Actions:

`FINDINGS NORMALIZATION GATE = PASS`

Следующий шаг:
23/30 — AI Fix Suggestions поверх уже нормализованных, ограниченных work items, без прямого применения изменений.
