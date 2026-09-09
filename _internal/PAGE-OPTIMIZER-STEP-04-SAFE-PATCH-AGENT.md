# LP-077 — Шаг 4/30: Safe Patch + Verification + Agent Loop

Дата: 2026-09-09
Статус: DONE

## Цель
Зафиксировать безопасный контракт применения ИИ-исправлений: агент не получает неограниченный доступ к проекту или production; каждое изменение ограничено областью, проверяется до применения, выполняется в изолированной Git-среде, проходит независимую верификацию и откатывается при регрессии.

## Главные референсы

### Aider — ADAPT
Сильные паттерны:
- Git как обязательный журнал изменений;
- авто-коммиты ИИ-правок;
- dirty-файлы отделяются от изменений агента;
- diff доступен для проверки;
- `/undo` откатывает последнее изменение;
- можно ограничить область файлов через ignore/subtree/read-only подходы;
- dry-run возможен до фактической записи.

Что берём:
- отдельная ветка/рабочая область на каждую задачу;
- snapshot исходного HEAD;
- запрет смешивания dirty state с агентной правкой;
- один concern на commit;
- обязательный diff до принятия;
- rollback как штатная операция, а не аварийный режим.

Что НЕ копируем:
- автоматическое принятие любого сгенерированного патча;
- обход pre-commit/test gate;
- произвольный shell/tool доступ для автономного режима.

### Playwright — KEEP
Роль:
- функциональные smoke tests;
- screenshots before/after;
- visual regression;
- DOM/network/console trace;
- проверка CTA, навигации и критических сценариев.

Ограничение:
- screenshot diff чувствителен к ОС, браузеру, шрифтам, аппаратной среде и динамическому контенту;
- baseline и after должны запускаться в одном контролируемом окружении;
- визуальный diff не является единственным доказательством корректности.

### Stagehand — ADAPT PRINCIPLE
Сильный паттерн:
`observe → validate → act`.

`observe()` сначала возвращает структурированное действие/selector/method/args, которое можно проверить, и только затем передать в `act` без второго LLM-решения.

Что берём:
- разведка и применение разделены;
- перед действием подтверждается существование target;
- deterministic action предпочтительнее нового LLM вызова;
- selector-scoped extraction уменьшает контекст и стоимость;
- кэширование повторяемых безопасных действий.

### Browser Use — STUDY / ADAPT SECURITY
Полезные ограничения:
- `allowed_domains`;
- `prohibited_domains`;
- domain-scoped secrets;
- sensitive data не обязаны попадать в LLM;
- возможность выключить vision на чувствительных страницах;
- `max_steps` / bounded execution;
- allowlist собственных tools по доменам.

Что берём как общий принцип:
- агент должен иметь минимальные capability и scope;
- секреты и production credentials не передаются модели текстом;
- навигация/действия ограничиваются явным allowlist;
- любой autonomous loop имеет жёсткий бюджет шагов.

Что не берём для MVP:
- универсальный browser agent как основную архитектуру;
- тысячи произвольных действий;
- возможность агента самостоятельно расширять права.

## Канонический Safe Patch Contract

`BASELINE → SNAPSHOT → SCOPE → PLAN → VALIDATE TARGETS → PATCH → STATIC CHECKS → PREVIEW → FUNCTIONAL TEST → VISUAL TEST → PERFORMANCE/SEO RECHECK → COMPARE → ACCEPT OR ROLLBACK`

### 1. BASELINE
До правки фиксируются:
- Git HEAD;
- список разрешённых файлов/ресурсов;
- page snapshot;
- ключевые метрики;
- screenshots;
- critical functional scenarios.

### 2. SNAPSHOT
Создаётся отдельная branch/worktree/recovery point.
Production и default branch напрямую не редактируются.

### 3. SCOPE
Агент получает:
- конкретный Finding ID;
- allowlisted tool;
- разрешённые файлы/селекторы/asset IDs;
- лимит файлов;
- лимит строк/байт изменений;
- временной/стоимостный budget.

### 4. PLAN
ИИ обязан вернуть структурированный план до записи:
- проблема;
- evidence;
- target;
- proposed change;
- expected gain;
- risk;
- verification contract.

### 5. VALIDATE TARGETS
Deterministic слой подтверждает:
- файл существует;
- selector/asset существует;
- target соответствует Finding;
- target не находится в FORBIDDEN зоне;
- hash/base version совпадает с анализировавшейся версией.

Если target изменился после аудита — patch запрещён, требуется новый audit.

### 6. PATCH
Разрешены только типизированные patch operations.
В первой версии запрещён arbitrary shell и произвольный массовый rewrite.

### 7. STATIC CHECKS
До браузера:
- syntax/parse;
- schema/type validation где применимо;
- запрещённые файлы не затронуты;
- diff budget не превышен;
- secrets не добавлены;
- неожиданные зависимости не добавлены.

### 8. PREVIEW
Патч применяется только в preview/isolated environment.

### 9. FUNCTIONAL TEST
Playwright проверяет заранее определённый page contract: загрузка, навигация, основные CTA/links/forms только там, где они относятся к странице и не требуют опасных реальных транзакций.

### 10. VISUAL TEST
Before/after в одинаковом окружении. Динамические области маскируются или исключаются только по зафиксированным правилам.

### 11. PERFORMANCE / SEO RECHECK
Повторяется только релевантный набор измерений, а не полный тяжёлый аудит при каждой микроправке.

### 12. COMPARE
Решение принимается по фактам:
- целевая проблема устранена;
- ожидаемый выигрыш достигнут или объяснимо не достигнут;
- нет новых P0/P1 регрессий;
- визуальные/функциональные проверки PASS.

### 13. ACCEPT / ROLLBACK
При PASS — отдельный commit/PR.
При FAIL — автоматический rollback к snapshot и фиксация failure fixture.

## Уровни автономности

### SAFE AUTO
Можно запускать автоматически после прохождения preconditions:
- image compression;
- resize без upscale;
- WebP/AVIF при подтверждённой policy;
- responsive variants;
- srcset/sizes;
- width/height;
- ограниченные lazy/fetchpriority/preload fixes.

### REVIEW REQUIRED
ИИ готовит patch, но применение требует подтверждения:
- title/meta;
- alt, если содержательная семантика неоднозначна;
- canonical/schema;
- структурный HTML/CSS;
- любые изменения, влияющие на видимый текст/позиционирование.

### FORBIDDEN AUTONOMOUS
- checkout/payments;
- business JS;
- analytics;
- authentication;
- backend/database;
- формы с реальными отправками;
- pricing/positioning;
- удаление блоков;
- изменение секретов/CI permissions;
- массовый refactor.

## Bounded Agent Loop

`GOAL → AUDIT → SELECT ONE SAFE FINDING → PLAN → PATCH → VERIFY → DECIDE`

Ограничения MVP:
- максимум 1 Finding за итерацию;
- максимум 3 итерации на одну цель;
- agent не может добавить новый tool;
- agent не может расширить file/domain allowlist;
- agent не может писать в default branch/production;
- agent не может отключить verification;
- agent не может сам пометить результат VERIFIED.

## Три независимые проверки результата

1. Deterministic/machine — target, diff, syntax, audit-specific measurements.
2. Functional/visual — Playwright scenarios + screenshots/diff.
3. Git/rollback — изменения изолированы и полностью обратимы.

## Pareto-решение
В MVP не строим универсальный автономный coding/browser agent. Строим маленький policy-controlled orchestrator над готовыми deterministic tools.

Наш собственный слой должен содержать только:
- Finding → allowed capability mapping;
- scope/policy engine;
- typed patch contracts;
- verification contract;
- decision/rollback logic;
- audit trail.

## Конкурентное преимущество
Не «ИИ умеет менять сайт», а:
`ИИ может менять только доказанно безопасное → система независимо проверяет результат → плохое изменение не проходит gate`.

Следующий шаг: 5/30 — провести security review реестра скилов/методик по всем этапам и зафиксировать ADOPT / EXTRACT METHOD / REJECT.