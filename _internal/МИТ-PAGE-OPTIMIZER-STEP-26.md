# МИТ — Page Optimizer — шаг 26/30

Дата: 2026-09-09
Issue: #210

## Решения

1. Независимая проверка проводится как внешний аудит, а не как продолжение авторских unit-тестов.
2. Найден P0: Side Panel рендерил данные страницы через `innerHTML`.
3. P0 закрыт: только `textContent/createTextNode`, CI запрещает unsafe HTML rendering primitives.
4. Prompt injection признан отдельным P1 для будущего hosted AI runtime. Сейчас модель в расширении не вызывается, поэтому риск не является активным execution path.
5. До подключения реального AI обязательна серверная граница: trusted policy отдельно от untrusted page content, structured output, deterministic validator, allowlist enforcement.
6. MCP annotations считаются hints, а не механизмом безопасности; enforcement остаётся в коде и runtime restrictions.
7. `missing_image_dimensions` и `missing_srcset` не возвращаются в byte-transform allowlist до отдельного HTML patch engine.
8. Hero heuristic не приравнивается к observed LCP.
9. Verified Improvement Rate остаётся основной метрикой safe-fix качества.
10. Шаг 27 разрешён только если после CI открытых P0 = 0.

## Проверки

- adversarial HTML-injection regression;
- malicious page text bounded in suggestion request;
- review-only model response cannot upgrade noindex to suggestion;
- extension permissions/read-only regression;
- image-core/MCP full regression.
