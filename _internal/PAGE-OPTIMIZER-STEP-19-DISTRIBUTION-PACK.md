# LP-080 — Шаг 19/30: дистрибуция Website Image Optimizer MCP

Дата: 2026-09-09
Статус: DISTRIBUTION PACK PREPARED / EXTERNAL SUBMISSIONS BLOCKED BY RELEASE GATES
Issue: #193

## Цель

Подготовить не массовый посев по каталогам, а короткий список каналов, которые дают реальную обнаруживаемость, установку или независимую техническую проверку.

Каноническая последовательность:

`PUBLIC RELEASE → OFFICIAL MCP REGISTRY → GLAMA → SMITHERY → MCP.SO → AWESOME-MCP-SERVERS`

Причина последовательности: downstream-каталоги не должны ссылаться на несуществующий npm-релиз, приватный monorepo или неподтвержденный endpoint.

## Каноническая идентичность

- Brand: `LayerPorter`
- Product: `Website Image Optimizer MCP`
- Full name: `LayerPorter Website Image Optimizer MCP`
- Official Registry ID: `com.layerporter/website-image-optimizer`
- npm: `@layerporter/image-optimizer-mcp`
- current release candidate: `0.1.0`
- transport: `stdio`
- tools: `5`
- product page: `https://layerporter.com/mcp/website-image-optimizer/`
- docs: `https://layerporter.com/docs/mcp/website-image-optimizer/`

Canonical short description:

`Page-aware MCP server for deterministic website image analysis and safe image optimization with bounded no-regression guards.`

Нельзя заменять это описанием generic image converter/editor.

---

## P0 — Official MCP Registry

### Роль

Канонический discovery/source-of-truth для MCP-клиентов и downstream registries.

### Подтвержденный процесс

Official Registry publisher:

1. `server.json` validation.
2. Registry authentication.
3. package ownership verification.
4. namespace verification.
5. publish.
6. после публикации проверка через Registry API search.

Registry пока имеет preview status, поэтому собственный сайт + npm остаются резервными каноническими поверхностями.

### Наш пакет

Уже есть:

- `packages/image-optimizer-mcp/server.json`
- `mcp-publisher validate` = PASS на шаге 17.

Блокеры:

- npm package фактически не опубликован;
- `com.layerporter` domain authentication ещё не завершена;
- license/release account gates шага 18 ещё открыты.

### Definition of done

Не считать опубликованным по успешной команде alone.

Нужно одновременно:

1. registry publish success;
2. Registry API search возвращает `com.layerporter/website-image-optimizer`;
3. version = npm version;
4. package identifier = `@layerporter/image-optimizer-mcp`;
5. install smoke из публичного npm PASS.

---

## P0 — Glama

### Почему P0

Glama не просто хранит ссылку: для open-source server выполняет source ingestion, build/run/introspection, security/quality/health checks и продолжает пересканировать сервер.

Это полезный независимый технический слой доверия.

### Актуальные требования

Open-source submission:

- публичный GitHub repository;
- display name;
- short description;
- submitter должен подтвердить ownership;
- Glama индексирует tools/schemas/annotations и проводит проверки.

Для organization repo возможен `glama.json`/GitHub App flow; для connector доступны GitHub/HTTP/DNS ownership checks.

### Наш текущий blocker

Текущий `OlegStrateg/layerporter-site` private и содержит весь монорепозиторий сайта.

**Запрещено делать весь site repo публичным ради Glama.**

Перед submission нужен один из вариантов:

A. выделенный публичный source repo только для MCP package;
B. публичный hosted Streamable HTTP connector.

До выбора A/B Glama submission = BLOCKED.

### Glama submission packet

Name:
`LayerPorter Website Image Optimizer MCP`

Description:
`Page-aware MCP server that analyzes website image context and performs bounded image optimization with no-upscale, alpha-preservation and never-increase-bytes guards.`

Category target:
`Developer Tools / Website Performance / Image Optimization` — финальную taxonomy выбрать по фактическим категориям Glama в момент подачи.

Required proof after submission:

- listing discoverable by product name;
- ownership claimed;
- build/introspection health PASS;
- quality/security status generated;
- all 5 tool names match source.

### glama.json

Не добавлять рабочий claim token заранее.

Для будущего dedicated public repo минимальная metadata должна использовать официальный Glama schema и maintainer identity. Claim token/ownership metadata генерируется только реальным Glama flow.

---

## P0 — Smithery

### Почему P0

Smithery дает distribution page, install/connect UX и usage analytics.

### Важное ограничение

Smithery URL publishing требует public Streamable HTTP endpoint.

Для local stdio серверов Smithery распространяет `.mcpb` bundle.

**Нельзя выдавать текущий stdio npm package за HTTP server.**

### Наш путь

На текущем этапе оптимален local distribution path:

`verified npm source → MCPB bundle → Smithery publish`

Hosted HTTP path оставляем на более позднюю версию, когда будет отдельный remote runtime/auth/security boundary.

### Smithery packet

Namespace target:
`layerporter/website-image-optimizer`

Name:
`Website Image Optimizer MCP`

Description:
`Page-aware website image analysis and bounded optimization for MCP clients.`

Transport:
`local / stdio via MCPB`

Blocker:
- MCPB ещё не собран и не проверен;
- Smithery namespace ownership ещё не подтвержден.

Definition of done:

1. MCPB built from same release commit/version;
2. clean Smithery install works;
3. exactly 5 tools introspected;
4. server page searchable;
5. no invented hosted URL/auth requirements.

---

## P1 — mcp.so

### Роль

Community discovery. Не считать independent technical verification.

### Актуальная подача

mcp.so указывает submission через GitHub issue; базово требуется ссылка и описание сервера. В репозитории `chatmcp/mcpso` существует центральный submission issue/history из тысяч заявок.

### Наш submission packet

Title:
`[Submit] LayerPorter Website Image Optimizer MCP — page-aware safe website image optimization`

Body:

```text
## MCP Server Submission: LayerPorter Website Image Optimizer MCP

Description:
Page-aware MCP server for deterministic website image analysis and safe image optimization with bounded no-regression guards.

Official MCP Registry:
com.layerporter/website-image-optimizer

npm:
@layerporter/image-optimizer-mcp

Website:
https://layerporter.com/mcp/website-image-optimizer/

Documentation:
https://layerporter.com/docs/mcp/website-image-optimizer/

Transport:
stdio

Tools:
- analyze_page_images
- optimize_image
- generate_responsive_variants
- compare_image_versions
- optimize_page_images

Safety boundaries:
- no arbitrary filesystem writes in the MCP layer
- no network fetch in the MCP layer
- batch <= 20
- responsive variants <= 6
- no-upscale and never-increase-bytes guards
- does not write changes to production
```

Do not submit until npm + Official Registry links resolve publicly.

Definition of done:
- mcp.so search finds exact product;
- install/source information is correct;
- no stale or duplicate listing.

---

## P1 — punkpeye/awesome-mcp-servers

### Почему оставляем

Очень большая developer visibility, но это не первичный канал.

### Новое важное требование

Актуальные PR проверки проекта требуют сначала:

1. listing on Glama;
2. ownership claim;
3. Glama quality score;
4. Glama score badge in README entry.

Следовательно:

`AWESOME-MCP-SERVERS DEPENDS ON GLAMA`.

### Submission entry draft

Категория финально выбирается по существующей taxonomy после публичного release.

```md
- [LayerPorter Website Image Optimizer MCP](PUBLIC_REPOSITORY_URL) - Page-aware website image analysis and bounded optimization with no-upscale and no-regression guards. [GLAMA_SCORE_BADGE]
```

Blocker:
- dedicated public repo / public server surface absent;
- Glama listing absent;
- Glama score absent.

Definition of done:
- PR merged;
- repository URL resolves;
- Glama badge resolves;
- description remains technically accurate.

---

## Каналы, которые НЕ ставим в первую волну

Не делать массовый submit в десятки low-trust каталогов только ради количества ссылок.

Причины исключения/отложения:

- нет собственного quality/security check;
- нет install/discovery traffic evidence;
- требуют оплату только за listing;
- требуют backlink badge без реальной аудитории;
- копируют Official Registry/Glama автоматически;
- создают duplicate entity pages;
- формируют спамный footprint вместо trust.

Вторую волну можно добавлять только если измеряется:

`REFERRAL / INSTALL / DISCOVERY / CITATION / INDEPENDENT VALIDATION`.

---

## Proof ledger — обязательная проверка после каждой подачи

Для каждого канала фиксируем:

- submitted_at;
- submission URL/id;
- indexed_at;
- exact listing URL;
- canonical name correct: yes/no;
- package/install command correct: yes/no;
- version correct: yes/no;
- 5 tools correct: yes/no;
- ownership verified: yes/no;
- health/quality score if supported;
- referral visits;
- installs/connections if measurable;
- AI citation/discovery baseline delta;
- status: SUBMITTED / INDEXED / VERIFIED / REJECTED / STALE.

Listing без проверки индексации не считается завершенной.

---

## Pareto order

1. Release npm + Official Registry.
2. Создать подходящую public source surface или connector surface для независимого сканирования.
3. Glama.
4. MCPB + Smithery.
5. mcp.so.
6. awesome-mcp-servers после Glama.
7. Только после данных — решать, нужны ли ещё каталоги.

## Gate

`DISTRIBUTION PREPARATION GATE = PASS`

`EXTERNAL SUBMISSION GATE = BLOCKED UNTIL PUBLIC RELEASE SURFACE EXISTS`
