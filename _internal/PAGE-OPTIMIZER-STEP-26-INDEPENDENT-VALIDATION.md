# LP-087 — Шаг 26/30: независимая проверка всего контура

Дата: 2026-09-09
Статус: IMPLEMENTED / CI PENDING
Issue: #210

## Цель

Проверить весь контур как внешний ревьюер, а не как автор системы:

`AUDIT → NORMALIZE → SUGGEST → SAFE FIX → VERIFY → RELEASE/DISTRIBUTION`

Критерий PASS: все P0 закрыты, P1/P2 явно зафиксированы и не маскируются зелёными unit-тестами.

## Независимые методы проверки

1. Code/contract review против актуальных Chrome MV3, MCP и OWASP принципов least privilege / untrusted input.
2. Adversarial review: HTML-инъекция из страницы, prompt-injection text, insufficient evidence, hero/LCP ambiguity, unsupported safe-fix rules, boundary dimensions.
3. Повторный CI: Page Audit Extension + image-core/MCP regression, включая pack/clean install/stdio/server.json validation.

## P0 — найдено и закрыто

### P0-1: untrusted HTML в Side Panel

Проблема: `sidepanel.js` использовал `innerHTML` для полей finding/evidence. Эти строки частично формируются из данных аудируемой страницы. Страница могла подложить HTML-разметку в доверенный интерфейс расширения и сфальсифицировать визуальное представление аудита.

Исправление:
- удалён `innerHTML`;
- все page-derived значения рендерятся через `textContent` / `createTextNode`;
- CI теперь запрещает `innerHTML =`, `outerHTML =`, `insertAdjacentHTML` в runtime расширения;
- добавлен adversarial static test.

Статус: CLOSED.

## P1 — зафиксировано, не блокирует текущий read-only MVP

### P1-1: prompt injection при будущем hosted AI runtime

Сейчас расширение не вызывает модель и не имеет API key/network runtime. Но `title`, `fact`, `evidence` являются недоверенными данными страницы. Когда появится backend inference, их нельзя смешивать с инструкциями модели как доверенный текст.

Обязательное решение до подключения реального AI runtime:
- page-derived content маркировать как untrusted data;
- system/policy instructions формировать отдельно на сервере;
- structured output + deterministic validator сохраняются;
- tool/action layer не должен принимать команды из page content;
- никакое поле страницы не может расширять allowlist или scope;
- при конфликте page text vs policy побеждает policy;
- логировать отказ/эскалацию в review_required.

Статус: DEFERRED BEFORE HOSTED AI.

### P1-2: Lighthouse/CWV authority

Текущий extension snapshot не является field CWV или Lighthouse. Hero heuristic не является observed LCP. Это уже отражено в модели, но публичный UX должен продолжать явно разделять heuristic и observed metrics.

Статус: CONTROLLED / VERIFY AT FUTURE PERFORMANCE LAYER.

### P1-3: HTML safe fixes отсутствуют

`missing_image_dimensions` и `missing_srcset` остаются safe-candidate findings, но не byte-transform safe fixes. До отдельного HTML patch engine они должны оставаться REVIEW_REQUIRED.

Статус: CONTROLLED.

## P2 — будущие улучшения

- отдельный чистый Chrome-profile / Playwright reference run для реальных страниц;
- axe-core как отдельный deterministic accessibility layer;
- наблюдаемость false-positive rate по реальным сайтам;
- UX-группировка подтверждено / эвристика / требует проверки;
- hosted inference rate limits и audit logging после появления backend.

## Проверка MCP

Tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) используются только как описание риска. Они не считаются enforcement. Реальные гарантии остаются в коде, schema limits, отсутствии network/filesystem write и CI contracts.

## Итоговая архитектурная оценка

Сильные стороны:
- минимальные Chrome permissions;
- deterministic rules перед AI;
- bounded context;
- safe-fix allowlist;
- отдельный candidate вместо production mutation;
- повторный audit как критерий успеха;
- Verified Improvement Rate вместо byte-savings vanity metric.

Главный оставшийся риск будущего автономного режима — не image transform, а соединение недоверенного контента страницы с AI/tool execution. Поэтому до шага Agent Mode потребуется отдельный policy/enforcement boundary.

## Gate

PASS при одновременном выполнении:
- Page Audit CI PASS после удаления unsafe HTML rendering;
- image-core/MCP CI PASS;
- P0 = 0 open;
- P1/P2 записаны и имеют явный future gate.
