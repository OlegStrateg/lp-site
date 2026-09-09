# МИТ — PAGE OPTIMIZER — ШАГ 8/30

Дата: 2026-09-09
Статус: DONE
Ветка: `research/LP-077-page-optimizer-base`
Issue: #182 / LP-077

## Что сделано

Собрана карта доверия и сущности бренда LayerPorter для обычного поиска, AI-поиска, MCP-клиентов и разработчиков.

## Главное решение

Доверие строится четырьмя слоями:
1. OWNED EVIDENCE — сайт/docs/benchmarks/security/privacy.
2. DISTRIBUTION EVIDENCE — GitHub/npm/MCP Registry и другие реальные поверхности использования.
3. INDEPENDENT EVIDENCE — внешние обзоры, исследования, проверки и integration pages.
4. RUNTIME TRUST — живой endpoint, handshake, tool schemas, TLS/OAuth, reliability/security checks.

## Field evidence 2026

Проверены:
- `pardovot/mcp-reliability-study` — большое исследование remote MCP reliability;
- MCP Skills `The Trust Middle` — dataset 2,233 MCP servers/skills;
- VerifyMCP;
- MCP Trust public reports;
- MCP Index.

Практический вывод: в MCP-рынке большая часть проектов не имеет сильного независимо проверяемого trust-профиля. Для LayerPorter это возможность выиграть не маркетинговыми claims, а воспроизводимыми benchmark/security/reliability данными.

## P0 trust stack

1. Каноническая product page.
2. MCP page + docs.
3. GitHub/npm/Official Registry с одинаковыми metadata.
4. Benchmarks/research с методологией и raw evidence.
5. Security/privacy/reliability documentation.
6. 3–5 независимых technical trust surfaces.

## Запрещено

- массовые каталоги ради ссылок;
- fake/paid reviews без независимой проверки;
- doorway pages;
- stars/downloads как trust без provenance;
- выдавать собственную страницу за независимый источник;
- разные product/category naming на сайте, GitHub, npm и Registry.

## Каноническая формула

`CANONICAL ENTITY → REPRODUCIBLE EVIDENCE → INDEPENDENT VALIDATION → RUNTIME TRUST → MEASURABLE CITATION/USAGE`.

## Проверки

1. Entity consistency.
2. Evidence quality.
3. Independent validation.

## Git

Основной файл шага:
`_internal/PAGE-OPTIMIZER-STEP-08-BRAND-TRUST-ENTITY-MAP.md`

## Следующий шаг

9/30 — продуктовая спецификация Website Image Optimizer: jobs-to-be-done, tool surface, inputs/outputs, security limits, hosted/local model hypotheses и Definition of Done первого коммерческого MCP.