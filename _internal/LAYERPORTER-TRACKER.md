# LayerPorter — постоянный трекер

Статус: **ACTIVE**.  
Дата включения: 2026-09-08.  
Master tracker: GitHub Issue #153.  
Каноническая стратегия: `_internal/LAYERPORTER-GROWTH-OS-2026-09-23.md`.  
Каноническая execution-roadmap: `_internal/LAYERPORTER-ROADMAP.md`.

## Правило трекера

После каждого значимого действия обновляются:
- текущий спринт;
- статус;
- фактический результат;
- проверки;
- issue / branch / PR / commit;
- блокеры;
- следующий шаг.

Никакой статус не повышается на основании намерения или локальной гипотезы.

## Статусы

- `BACKLOG` — ещё не начинали;
- `READY` — можно начинать, зависимости закрыты;
- `ACTIVE` — идёт работа;
- `BLOCKED` — есть конкретная зависимость;
- `REVIEW` — работа сделана, проходит проверки;
- `PRODUCTION` — смержено/развёрнуто, но не завершена финальная проверка;
- `VERIFIED` — результат фактически проверен;
- `HOLD` — сознательно не продолжаем до отдельного решения.

## Текущая production-точка

- Repository: `OlegStrateg/layerporter-site`
- Production branch: `master`
- Verified master SHA на момент включения трекера: `358d3b73ca477e2246ebd142cb6604193789dcc6`
- Последняя подтверждённая задача production: LP-060 live-gate продуктовой аналитики.

Перед каждой новой реализацией SHA перепроверяется. Этот SHA нельзя автоматически считать актуальным в будущем.

## Активные задачи

| Трек | Спринт | Issue | Статус | Результат |
|---|---|---:|---|---|
| Управление | Каноническая roadmap + tracker | #153 | ACTIVE | master tracker и execution-roadmap |
| Управление | LP-117 — Growth OS 11/10 | #290 | REVIEW | каноническая стратегия SEO/Web → Extensions → MCP → AI/Paid |
| Управление | Документы roadmap/tracker | #155 | REVIEW | новая каноническая roadmap и tracker в отдельной ветке |
| C | LP-097 — Agent Reputation pilot | #229 | ACTIVE | 14-шаговый PostingBoard эксперимент: репутация → цитирование → внешний след |
| A | Sprint A0 — полный аудит сайта | #154 | ACTIVE | реестр URL + READY/IMPROVE/HOLD + Pareto |
| A | Sprint A1 — техническая индексация | #156 | BLOCKED | ждёт завершения A0 |
| A | Sprint A2 — денежные страницы | — | BACKLOG | Home + Extensions + 2 расширения |
| A | Sprint A3 — GSC-demand страницы | — | BACKLOG | converters / formats / guides по реальному спросу |
| B | Sprint B0 — общее функциональное ядро | — | BACKLOG | минимальный общий runtime |
| B | Sprint B1 — Crop + Resize | — | BACKLOG | первые универсальные инструменты |
| B | Sprint B2 — Compress + Convert | — | BACKLOG | общий pipeline + узкие входы |
| B | Sprint B3 — Text + Meme | — | BACKLOG | функции общего canvas |
| B | Sprint B4 — handoff расширений | — | BACKLOG | расширение → сайт → обработка → export |
| B | Sprint B5 — Media Core | — | BACKLOG | Remove Sound + Extract Audio |
| B | Sprint B6 — Background Removal benchmark | — | BACKLOG | выбор решения по quality/cost/license |
| B | Sprint B7 — следующие AI-функции | — | BACKLOG | только после подтверждения спроса |

## Track C — Agent Reputation / Field Intelligence

### LP-097 — PostingBoard pilot

Issue: #229.
Статус: `ACTIVE`.
Branch: `research/LP-097-agent-reputation`.
Baseline master на старте: `8ca11132b8cec267d1b88ff85232d58483353c63`.

Цель: доказать или опровергнуть, что технически полезный агент LayerPorter способен получить устойчивую машинную репутацию, независимые цитирования и внешний проверяемый след.

Формат: 14 шагов. Первый пилот — только PostingBoard. Другие сети подключаются только после SCALE gate.

Главный результат: не лайки и не количество публикаций, а `повторное взаимодействие → входящий mention/DM → citation → adoption → external validation`.

Текущий шаг: `1/14 — EXP + hypothesis + metrics + gates`.

Следующий шаг: `2/14 — security / permissions boundary`.

## Sprint A0 — текущий фокус

Issue: #154.
Статус: `ACTIVE`.

### Цель

Не чинить страницы наугад. Сначала получить полную фактическую карту сайта и качества.

### Обязательная выходная матрица

`URL | тип | язык | intent | ключ | источник | GSC | перевод | SEO | AI | CRO | релевантное расширение | CTA | техника | статус | приоритет | действие`

### Проверяемые слои

1. Фактическое состояние production/Git/GSC.
2. Семантика: GSC + Semrush/ASO + SERP/Suggest.
3. Язык и качество перевода.
4. SEO страницы и риск каннибализации.
5. AI-search readiness без псевдо-GEO.
6. CRO и воронка в релевантное расширение.
7. canonical / hreflang / schema / robots / sitemap / www / региональные URL.

### Pareto-порядок

1. URL с уже существующими GSC показами/кликами.
2. Home.
3. Extensions Hub.
4. Pinterest Downloader.
5. Picture Converter.
6. Convert Hub.
7. отдельные converters.
8. Formats / Guides.
9. остальные опубликованные страницы.

### Definition of Done A0

- полный URL inventory;
- каждая индексируемая/публичная SEO-страница классифицирована;
- выявлены критические языковые дефекты;
- выявлены SEO-конфликты и каннибализация;
- для коммерческих страниц назначена CRO-цель;
- построена карта `URL → intent → extension → CTA`;
- получен Pareto backlog исправлений;
- отдельные implementation issue созданы только после аудита.

## Известные факты на старте A0

- GSC подключён и выдаёт фактические Search Analytics по `sc-domain:layerporter.com`.
- Полный Google report «indexed / not indexed» через текущий read-коннектор не подтверждён; отсутствие показов нельзя трактовать как отсутствие индексации.
- Production sitemap генерируется вручную и объединяет статические URL, Convert Hub locales, Pinterest locales, Picture Converter locales, converters и articles; точное итоговое число emitted URL проверяется в A0 по фактическому build/live sitemap.
- В GSC исторически встречаются `www.layerporter.com` и старые региональные URL; это гипотеза технической очистки для A1, а не доказательство текущей поломки.
- `seo/LP-056-convert-copy-audit-49` существует, но разошлась с production; использовать только как источник материалов.
- По Home уже есть CRO-аудит с проблемами фокуса hero, конкурирующих CTA, слабого proof и смешения сценариев. Эти выводы являются гипотезами для проверки против фактической SEO-семантики и целевой воронки в расширения, а не разрешением на немедленный редизайн.

## Track A — очередь после аудита

### A1 — технический индекс

Разблокируется только после A0.

Проверить и исправить по фактам:
- www → non-www;
- canonical;
- hreflang;
- региональные дубли;
- sitemap;
- READY/HOLD policy;
- повторное предоставление Google актуальной карты после критических исправлений.

### A2 — денежные страницы

Цель: установки расширений.

Проверяются:
- Home локали;
- Extensions Hub локали;
- Pinterest Downloader локали;
- Picture Converter локали.

Нельзя считать локаль готовой только потому, что для неё есть ASO/SEO-текст. Язык + CRO + продуктовая правда обязательны.

### A3 — страницы поискового спроса

Приоритет — реальный GSC signal:
- converters;
- formats;
- guides.

## Track B — продуктовая линия

Новая функция получает высокий приоритет, если:
- имеет спрос;
- использует общий runtime;
- создаёт отдельный узкий SEO-вход;
- усиливает одно или несколько расширений;
- быстро проверяется;
- не требует опасного лицензирования/стоимости без benchmark.

Текущий предварительный Pareto: `Crop → Resize → Compress/Convert → Text/Meme → Media Core → AI benchmark`.

## Журнал решений трекера

### 2026-09-23

- Зафиксирован LP-117 / #290 — LayerPorter Growth OS 11/10.
- Новый стратегический authority: `_internal/LAYERPORTER-GROWTH-OS-2026-09-23.md`.
- Разделены search architecture и navigation architecture.
- Закреплены 4 продуктовых контура: SEO/Web Tools, Extensions, MCP/Agents, AI/Paid.
- Закреплён принцип `one core capability → Web UI → SEO landing → Extension → MCP → future API`.
- Введены Opportunity Score и Tool Quality Gate.
- Существенные решения обязаны проходить независимый review SEO/CRO/UX/UI/Marketing/Analytics/Architecture/MCP/AI Monetization + Red Team.
- Обязательные выходные артефакты стратегии: Master Product & SEO Map, Opportunity Matrix, 12-Month Growth Roadmap.
- Текущий Sprint A0 не отменяется; его scope расширяется до полной карты capability + URL + extension/MCP/paid adjacency.


### 2026-09-11

- Запущен LP-097 / #229 — 14-дневный эксперимент LayerPorter Agent Reputation.
- Первый пилот ограничен PostingBoard; мультисетевое масштабирование только после SCALE gate.
- Фиксирован baseline master `8ca11132b8cec267d1b88ff85232d58483353c63` и рабочая ветка `research/LP-097-agent-reputation`.
- Главная метрика: независимое повторное использование/цитирование и внешний след, а не реакции/карма.
- Включён формат отчёта `N/14 → evidence → Git state → blockers → next step`.

### 2026-09-08

- Зафиксирована модель: узкие расширения + многофункциональный сайт на общем ядре.
- Зафиксировано правило: один интент → один владелец URL.
- Зафиксирована CRO-модель: страницы инструментов сначала дают результат, затем релевантно ведут в расширение.
- Массовые новые локали заморожены до quality gate.
- Трек A и Трек B разделены.
- Sprint A0 назначен текущим активным спринтом.
- Sprint A1 заблокирован до завершения A0.
- Включён постоянный master tracker #153.