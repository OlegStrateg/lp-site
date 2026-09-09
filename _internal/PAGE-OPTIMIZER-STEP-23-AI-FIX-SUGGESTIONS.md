# LP-084 — Шаг 23/30: AI Fix Suggestions

Дата: 2026-09-09
Статус: PASS
Issue: #202

## Цель

Добавить ИИ-слой рекомендаций поверх нормализованных findings без применения изменений.

Архитектура:

`Normalized Finding → Evidence Envelope → Suggestion Contract → Structured Response → Deterministic Validator → Side Panel Preview`

## Оптимизационный обзор

Проверены актуальные подходы Aider/Stagehand: планирование/предложение отделяется от действия, состояние должно оставаться проверяемым и обратимым, детерминированный код ограничивает область действий модели.

Решение:
- не передавать модели весь DOM/весь snapshot;
- один work item на запрос;
- максимум 3 evidence samples;
- обрезка длинных строк;
- модель не получает изображения/resources массива целиком;
- обязательный structured output;
- ответ проходит детерминированный validator;
- API key/провайдер не хранится в расширении;
- на этом шаге нет сетевого runtime и нет фактического вызова модели.

## Request contract

`buildSuggestionRequest()` передает:
- URL страницы;
- title страницы;
- rule/category/severity/confidence/priority;
- affected count;
- fact/impact/fixability/verification;
- максимум 3 evidence samples.

Hard constraints:
- `noApply = true`;
- `noScopeExpansion = true`;
- `noUnsupportedClaims = true`.

## Response contract

Допустимые статусы:
- `suggestion`;
- `review_required`;
- `insufficient_evidence`.

Обязательные поля:
- summary;
- rationale;
- proposedChange;
- target;
- verificationPlan;
- assumptions.

## Review-only rules

Никогда не допускаются как прямой safe suggestion на этом шаге:
- missing title;
- missing meta description;
- missing/multiple H1;
- missing canonical;
- noindex;
- hero lazy heuristic.

Они могут возвращаться только как `review_required`.

`safe-candidate` в finding не означает `safe-to-apply`.

## Side Panel

Каждый work item теперь показывает readiness:
- AI suggestion: ready;
- AI suggestion: review required;
- AI suggestion: blocked.

Это readiness слоя рекомендаций, а не факт вызова модели.

## Безопасность

Не добавлено:
- fetch/XMLHttpRequest;
- API keys;
- host permissions;
- DOM writes;
- filesystem writes;
- production writes;
- autonomous actions.

## Проверки

1. Bounded-context tests: один finding, максимум 3 evidence, нет полного images/resources snapshot — PASS.
2. Structured validator tests: обязательные поля, лимиты, review-only enforcement — PASS.
3. Existing MV3 permission/write/network regression suite — PASS.
4. GitHub Actions Run `34389694763` — SUCCESS.

## Gate

`AI FIX SUGGESTION CONTRACT = PASS`

Это не означает включенный hosted AI runtime. Подключение провайдера требует отдельного защищённого backend/runtime решения.
