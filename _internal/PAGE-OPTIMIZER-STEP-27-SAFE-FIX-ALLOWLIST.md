# LP-088 — Шаг 27/30: расширение Safe Fix allowlist

Дата: 2026-09-09
Статус: IMPLEMENTED / CI PENDING
Issue: #211

## Цель

Расширить автоматический Safe Fix только теми изменениями, которые:
- детерминированы;
- не меняют дизайн или бизнес-логику;
- имеют preview boundary;
- не пишут в production;
- подтверждаются повторным аудитом.

## Pareto Gate

Проверены кандидаты:
1. `width/height` для `<img>`;
2. `srcset/sizes`;
3. `loading=lazy` / removal;
4. `fetchpriority` / preload.

Решение:
- `missing_image_dimensions` → ДОПУЩЕН как новый safe markup preview fix;
- `missing_srcset` → НЕ ДОПУЩЕН до появления реальных generated variant URLs и source mapping;
- hero/LCP lazy/fetchpriority → НЕ ДОПУЩЕН на основе эвристики, нужен observed LCP;
- preload → НЕ ДОПУЩЕН без подтвержденной resource identity и независимого performance evidence.

Основание: width/height attributes дают браузеру intrinsic aspect ratio и позволяют резервировать место до загрузки изображения. Для LCP Google отдельно рекомендует не lazy-load подтвержденный LCP и использовать fetchpriority осознанно, но эти решения требуют измерения, а не hero-эвристики.

## Новый безопасный patch contract

`buildSafeMarkupFixPlan()` допускает только `missing_image_dimensions` и требует:
- confidence = high;
- snapshot image id;
- известные intrinsic width/height;
- реальные rendered width/height;
- rendered aspect ratio отличается от intrinsic не более чем на 3%;
- существующие dimension attributes, если есть, должны быть положительными целыми.

Patch:
- если оба атрибута отсутствуют → используются intrinsic dimensions;
- если задан только width → height вычисляется по intrinsic ratio;
- если задан только height → width вычисляется по intrinsic ratio;
- исходные facts не мутируются;
- production write отсутствует.

## Почему ratio guard обязателен

Если реальный rendered aspect ratio заметно отличается от intrinsic ratio, вероятна crop/object-fit/layout-специфика. Автоматическое добавление intrinsic aspect ratio в таком случае может изменить резервируемую геометрию до загрузки. Поэтому такой кейс переводится в REVIEW_REQUIRED.

## Проверки

1. Before/after deterministic audit: `missing_image_dimensions` обязан исчезнуть после preview patch.
2. Original facts immutable; patch target должен совпадать с image id.
3. Aspect-ratio mismatch, malformed attrs, low confidence и unsupported rules блокируются.
4. Existing Chrome permissions/network/write/unsafe HTML regression остаётся неизменным.

## Allowlist после шага 27

### Byte-transform safe
- `oversized_image`

### Markup-preview safe
- `missing_image_dimensions`

### Review required
- `missing_srcset`
- `hero_lazy`
- fetchpriority/preload без observed LCP
- SEO/meta/canonical/H1/text
- JS/business logic/forms/analytics/backend

## Gate

PASS только после зелёного CI и повторного аудита before/after.
