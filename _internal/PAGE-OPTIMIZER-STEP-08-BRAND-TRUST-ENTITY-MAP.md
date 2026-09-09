# LP-077 — Шаг 8/30: Карта доверия и сущности бренда

Дата: 2026-09-09
Статус: DONE

## Цель
Определить, какие внешние и собственные поверхности реально усиливают доверие к LayerPorter как к техническому продукту и формируют проверяемую сущность бренда для обычного поиска, AI-поиска, MCP-клиентов и разработчиков.

## Главное разделение

Не смешивать:
1. OWNED EVIDENCE — собственные страницы, документация, benchmark, changelog, security/privacy.
2. DISTRIBUTION EVIDENCE — registry/npm/GitHub/каталоги, где продукт реально можно найти или использовать.
3. INDEPENDENT EVIDENCE — внешние обзоры, исследования, сравнения, упоминания и проверки третьих сторон.
4. RUNTIME TRUST — доступность сервера, корректность протокола, TLS/OAuth, security/reliability checks.

Сильная сущность строится не количеством ссылок, а согласованностью этих четырёх слоёв.

## Полевая проверка MCP-рынка 2026

### MCP runtime reliability research
Источник: https://github.com/pardovot/mcp-reliability-study
На 2026-08-18 исследование классифицировало 14,298 серверов из official registry и отдельно проверяло remote endpoints на handshake/protocol behaviour.
Вывод для LayerPorter: доступный и реально работающий remote MCP уже сам по себе является trust-сигналом относительно большого количества мёртвых/ломающихся записей.

### MCP Skills trust dataset
Источник: https://mcpskills.io/blog/the-trust-middle
Исследование 2,233 MCP servers/skills показывает, что большая часть экосистемы находится в среднем trust-диапазоне; verified — меньшинство.
Вывод: security/reliability прозрачность и reproducible evidence могут стать сильным дифференциатором.

### VerifyMCP / MCP Trust / MCP Index
Источники:
- https://verifymcp.io/
- https://github.com/SteveMonsway/mcp-trust
- https://themcpindex.com/

Общий паттерн рынка:
- живой handshake;
- schema inspection;
- TLS/OAuth;
- dependency/security checks;
- last-verified date;
- наличие GitHub/npm;
- capability matrix;
- честные ограничения.

Решение: не просить «доверять описанию LayerPorter», а публиковать данные, которые могут быть независимо перепроверены.

## Каноническая карта trust/entity

### P0 — обязательные собственные поверхности

#### 1. Каноническая продуктовая страница
`layerporter.com/page-optimizer/`
Должна содержать:
- exact product name;
- одно чёткое category statement;
- реальные возможности;
- ограничения;
- связь с Website Image Optimizer MCP;
- security/verification model;
- ссылки на docs/repo/benchmarks/privacy.

#### 2. MCP product page
`layerporter.com/mcp/website-image-optimizer/`
- endpoint/install/connect;
- tools;
- inputs/outputs;
- authentication;
- limits;
- security model;
- uptime/health where available;
- changelog/release.

#### 3. Documentation
`layerporter.com/docs/...`
Документация должна быть индексируемой, чистой, стабильной по URL и синхронизированной с GitHub/npm metadata.

#### 4. Benchmarks / Research
`layerporter.com/benchmarks/` и/или `layerporter.com/research/`
Только собственные reproducible data:
- test corpus;
- methodology;
- versions;
- hardware/runtime;
- before/after bytes;
- quality guard;
- latency/CPU cost;
- failures/caveats;
- raw or machine-readable output where practical.

Это главный кандидат на earned citations. Generic marketing articles не считать research.

#### 5. Security / Privacy / Reliability
Отдельные документы:
- permissions/data flow;
- remote URL security;
- secrets handling;
- no-production-direct-write policy;
- rollback/verification contract;
- incident/contact path;
- last verified/release status.

## P0 — внешние технические поверхности

### GitHub
Должен подтверждать сущность:
- exact same product name;
- homepage;
- docs;
- license;
- changelog/releases;
- security policy;
- issues;
- reproducible examples;
- benchmarks;
- tags/releases.

GitHub — не backlink tactic, а публичный технический паспорт.

### npm
Если есть package:
- name/version;
- homepage;
- repository;
- bugs;
- keywords;
- license;
- README;
- provenance/attestation where available.

### Official MCP Registry
Роль: canonical ecosystem presence + machine discovery.
Не считать листинг доказательством качества; качество подтверждают runtime checks и independent checks.

## P1 — независимые доверительные поверхности

Приоритет только тем площадкам, где есть реальная редакционная/техническая проверка:
- MCP Index-like curated reviews;
- VerifyMCP / trust scanners;
- MCP Trust public reports;
- профильные developer-tool обзоры;
- независимые GitHub awesome/research lists с ручной модерацией;
- статьи/сравнения с raw data;
- реальные integration partner pages.

Цель — получить независимую проверяемую сущность, а не просто ссылку.

## Что потенциально сильнее обычной статьи

1. reproducible benchmark;
2. public dataset;
3. public reliability/security report;
4. open-source technical artifact;
5. integration accepted by another product;
6. third-party technical review;
7. real case study with before/after data.

Причина: такие источники легче перепроверять, цитировать и использовать как evidence.

## Что не считать trust-активом

- массовые SEO directories;
- fake reviews;
- paid profiles без редакционной проверки;
- одинаковые press-release копии;
- doorway pages;
- «AI SEO/GEO» каталоги без трафика, индексации и репутации;
- листинг, который никто не может найти;
- собственная страница, выдаваемая за независимое доказательство;
- stars/downloads без проверки provenance.

## Entity consistency contract

Во всех поверхностях одинаково:
- Brand: LayerPorter
- Product: LayerPorter Page Optimizer
- Subproduct: Website Image Optimization MCP
- Canonical homepage
- Repository
- Documentation
- Privacy
- Security
- Support/contact
- One-sentence category statement

Запрещены разные названия/описания категории на npm, GitHub, Registry и сайте.

## Measurement

Для каждого источника фиксировать:
`surface | owner | independent? | indexable? | canonical link | product naming consistent? | technical evidence | runtime evidence | referral | citations | discovered by AI | status | date`

Статусы:
TARGET → PUBLISHED → INDEXED → VERIFIED → CITED/USED → NO SIGNAL → RETEST/REMOVE.

## Pareto-решение

Не строить 50 профилей.

Первые 20% действий:
1. сильная каноническая product page;
2. public GitHub/npm/Registry metadata;
3. benchmark/research с raw methodology;
4. security/privacy/reliability pages;
5. 3–5 независимых technical trust surfaces;
6. измерение citations/referrals/runtime trust.

## Три проверки результата

1. Entity consistency — одинаковое имя/категория/URL на всех P0 поверхностях.
2. Evidence quality — каждая сильная claim опирается на проверяемые данные.
3. Independent validation — минимум один внешний источник может подтвердить runtime/security/reliability независимо от LayerPorter.

## Решение шага 8

Главный moat доверия формулируется так:

`CANONICAL ENTITY → REPRODUCIBLE EVIDENCE → INDEPENDENT VALIDATION → RUNTIME TRUST → MEASURABLE CITATION/USAGE`.

Следующий шаг: 9/30 — продуктовая спецификация Website Image Optimizer: точные jobs-to-be-done, tool surface, входы/выходы, security limits, pricing/hosted-vs-local hypotheses и Definition of Done первого коммерческого MCP.