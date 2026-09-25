# LayerPorter MCP — Field Intelligence по дистрибуции и discovery

Дата: 2026-09-25  
Задача: LP-118 / #294  
Статус: RESEARCH DRAFT  
База: master `f1df3285ff980d13506e04b2509475e94872d021`

## 1. Решение в одном абзаце

LayerPorter нельзя продвигать как «ещё один MCP server». Главный вход должен быть problem-first: человек или агент ищет решение задачи `optimize website images`, `compress website images`, `convert images to webp`, `responsive images`, `LCP image optimization` и получает работающий LayerPorter. MCP — один из способов забрать этот спрос в повторяемый AI-workflow.

Для MCP-discovery нужны четыре слоя одновременно:

1. каноническая публикация и доверие: npm + Official MCP Registry;
2. downstream discovery: Glama и несколько крупных каталогов/awesome lists;
3. install/activation UX: 1-click/1-command setup, exact client snippets, готовые outcome prompts, реальный before/after;
4. community/AI discovery: реальные кейсы в Cursor/Claude/HN/Reddit и tool metadata, по которым агент понимает, когда выбрать LayerPorter.

Каталоги сами по себе не являются стратегией роста.

---

## 2. Фактическое текущее состояние LayerPorter

- npm package: `@layerporter/image-optimizer-mcp`.
- Public npm: 0.1.0.
- npm на момент проверки показывает 0 weekly downloads.
- 0.1.0 уже публичен, но его README всё ещё содержит устаревшее «not yet public» и старый repository URL `OlegStrateg/layerporter-site`.
- Official MCP Registry: LayerPorter ещё не опубликован.
- В текущем поиске Glama / mcpservers.org / mcp.so LayerPorter не найден.
- Search Console за последние 90 дней не вернул строк по `/mcp/website-image-optimizer/`.
- 0.1.1 подготовлен в `release/LP-103-security-0.1.1`, но publication сейчас блокируется repository variable `LP_MCP_RELEASE_ENABLED`; это отдельная release-задача, не LP-118.

Следствие: широкое продвижение до VERIFIED 0.1.1 преждевременно, но distribution assets и SEO-архитектуру можно готовить уже сейчас.

---

## 3. Что показывает экосистема

### 3.1 Official MCP Registry — канонический слой, но не доказанный acquisition channel

Official Registry сам описывает себя как централизованный metadata source для MCP clients и aggregators. Он хранит `server.json`, package/remote location, install instructions, description/capabilities и даёт REST API клиентам/агрегаторам.

Источник:
- https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/about.mdx
- https://github.com/modelcontextprotocol/registry/discussions/11

Ключевой вывод: Registry нужен обязательно как source of truth и upstream для downstream discovery, но публикация в нём сама по себе не доказывает поток пользователей.

### 3.2 Glama усиливает Official Registry и индексирует tools

На 24–25.09.2026 Glama заявляет:
- 91k+ MCP servers;
- 23k+ connectors;
- 856k+ tools;
- поиск не только servers, но tool names, descriptions, schemas, annotations.

Источник:
- https://glama.ai/
- https://glama.ai/mcp/methodology

Для LayerPorter это критично: `optimize_image`, `optimize_url_images`, descriptions и input schema становятся частью discovery surface.

Glama также публикует собственное исследование, по которому качественно описанные tools модели выбирали на 260% чаще слабых descriptions. Это сильный сигнал, но источник аффилирован с самим Glama, поэтому считать это доказанным универсальным коэффициентом нельзя.

### 3.3 Registry перегружен шумом — качество и trust важнее «просто присутствия»

Публичный аудит Registry от августа 2026:
- 15,329 remote URL;
- только 8,235 ответили на MCP tools/list;
- 140k+ tool descriptions;
- встречаются огромные `initialize.instructions` вплоть до десятков тысяч символов;
- значительная доля каталога — bulk registrations.

Источник:
- https://github.com/modelcontextprotocol/registry/discussions/1591

Вывод: число листингов не равно качественному discovery. LayerPorter должен выигрывать не количеством metadata, а живым сервером/пакетом, понятной специализацией, хорошими descriptions, evidence и низким install friction.

### 3.4 В сообществах люди выбирают outcome, а не слово MCP

Reddit Cursor/Claude обсуждения регулярно выглядят как:
- «какие MCP реально используете?»;
- «что стало частью ежедневного workflow?»;
- рекомендации Context7, Playwright, Supabase, GitHub и других по конкретной пользе.

Примеры:
- https://www.reddit.com/r/cursor/comments/1l315gt
- https://www.reddit.com/r/cursor/comments/1pu5109
- https://www.reddit.com/r/cursor/comments/1iv22s3
- https://www.reddit.com/r/cursor/comments/1kgx2kl
- https://www.reddit.com/r/ClaudeAI/comments/1vsrkm1/

Отдельно отмечается, что дополнительные rules/descriptions «когда использовать tool» повышают вероятность, что Cursor выберет MCP автоматически:
- https://www.reddit.com/r/cursor/comments/1jfr0et

Вывод: community post должен продавать не «мы сделали MCP», а измеримый workflow:
`дай URL → LayerPorter найдёт тяжёлые изображения → оптимизирует → вернёт before/after`.

### 3.5 Hacker News подтверждает: формат «MCP» ничего не гарантирует

Примеры Show HN дают огромный разброс:
- generic/niche MCP: 1–9 points;
- понятная developer pain + working demo: 60–100+;
- сильная новая interaction model: 150–200+.

Примеры:
- Playwright/API docs workflows — 100+;
- Blender natural-language workflow — 150+;
- «course as MCP» — 200+;
- многие generic MCP launches — 1–15.

Источники:
- https://news.ycombinator.com/item?id=43459240
- https://news.ycombinator.com/item?id=44622374
- https://news.ycombinator.com/item?id=44241202
- https://news.ycombinator.com/item?id=47180907

Вывод: HN — launch amplifier только когда есть демонстрируемый результат и понятная техническая новизна. Публиковать «вышел LayerPorter MCP» без outcome-demo — слабая ставка.

### 3.6 Product Hunt — дополнительный launch spike, не базовый канал

MCP Playground и MCPJam получили заметное внимание, но их proposition очень легко понять без знания MCP: «попробуй сервер без установки», «тестируй и оценивай MCP».

Примеры:
- https://www.producthunt.com/products/mcp-playground
- https://www.producthunt.com/products/mcpjam-inspector

Вывод: Product Hunt имеет смысл позже для Remote LayerPorter / free audit / Page Optimizer, а не как главный канал локального stdio package.

### 3.7 Популярные MCP снижают install friction почти до нуля

#### Context7

GitHub на 25.09.2026: ~62k stars.

README сразу содержит:
- Cursor one-click install;
- конкретную боль «outdated docs / hallucinated APIs»;
- before/after framing;
- готовые prompts;
- `npx ctx7 setup`;
- Remote MCP URL;
- manual setup;
- документацию для 30+ clients;
- правила «когда всегда использовать Context7»;
- локализации;
- media/social proof.

Источник:
- https://github.com/upstash/context7

#### Microsoft Playwright MCP

GitHub: ~37.5k stars.

README:
- outcome в первом абзаце;
- стандартный config;
- install buttons;
- Claude Code / Cursor / Codex / VS Code / Copilot / Windsurf / десятки клиентов;
- объясняет, когда MCP лучше CLI и когда хуже.

Источник:
- https://github.com/microsoft/playwright-mcp

#### GitHub MCP

GitHub: ~33k stars.

Сила — бренд + официальный статус + интеграция с существующим продуктовым workflow.

Источник:
- https://github.com/github/github-mcp-server

#### Supabase MCP

GitHub: ~2.9k stars.

Remote URL + OAuth + project-scoped setup + dashboard connection flow. MCP — continuation существующего продукта, а не отдельный продукт.

Источник:
- https://github.com/supabase/mcp

Stars здесь являются результатом множества факторов и не доказывают причинность. Но упаковка top projects показывает повторяющиеся pattern: понятная боль → очень лёгкая установка → много client paths → реальный workflow → trust.

---

## 4. HYPOTHESIS → EVIDENCE → DECISION

### H1. «Нужно попасть во все MCP directories»

EVIDENCE:
- directory ecosystem огромный;
- существуют автоматизаторы типа `mcp-submit`, которые отправляют сразу в Official Registry, Smithery, MCPCentral, mcp.so и awesome lists;
- Official Registry downstream-consumed.

COUNTER-EVIDENCE:
- данных, что каждый каталог даёт meaningful installs, нет;
- community complaints указывают на directory overload;
- HN прямо обсуждает вероятность, что distribution в итоге будет принадлежать клиентам: Claude, ChatGPT, Cursor, VS Code.

RISK: потратить много времени на десятки мелких каталогов.

DECISION: **PARTIAL YES.**
После 0.1.1: Official Registry + Glama + 2–4 крупных downstream surfaces. Остальные — только дешёвой автоматической синдикацией и с UTM/ref attribution.

### H2. «Нужно SEO только под MCP keywords»

EVIDENCE:
- MCP directories и запросы существуют.

COUNTER-EVIDENCE:
- Google Suggest reconnaissance LayerPorter уже показал больше вариантов у problem queries;
- пользовательский workflow начинается с проблемы;
- продукты-лидеры объясняют конкретный outcome.

DECISION: **REJECT.**
MCP keywords — отдельный кластер, но главный acquisition layer = website image optimization problems.

### H3. «Tool descriptions — маркетинговая часть продукта»

EVIDENCE:
- Glama индексирует tool names/descriptions/schemas/annotations;
- search tools в registry ecosystems ранжируют по title/tool-name/description;
- Glama research показывает сильное влияние description quality;
- Reddit users отмечают рост автоматического выбора tools после явного when-to-use guidance.

COUNTER-EVIDENCE:
- конкретный коэффициент 260% нельзя переносить автоматически на все модели/клиенты.

DECISION: **STRONG YES.**
Descriptions проектируются как machine-facing CRO.

### H4. «README — фактически landing page»

EVIDENCE:
- Context7/Playwright/GitHub/Supabase используют README как install funnel;
- GitHub часто является первым результатом и source для каталогов/агентов;
- MCP Registry historically обсуждал scraping/inference из GitHub metadata как один из discovery mechanisms.

DECISION: **YES.**
LayerPorter README должен начинаться с outcome, demo, one-command install, verified clients, 3–5 prompts, tools, security/limitations.

### H5. «Stars сами дадут discovery»

EVIDENCE:
- directories используют stars/popularity как один из trust/ranking signals.

COUNTER-EVIDENCE:
- бренды GitHub/Microsoft/Supabase уже имеют огромную distribution;
- stars — lagging metric, не acquisition mechanism;
- нишевые HN launches могут иметь хороший discussion без дальнейшего usage.

DECISION: **REJECT AS KPI.**
Stars = secondary trust signal. KPI = first successful workflow + repeat.

### H6. «Remote MCP нужен для роста»

EVIDENCE:
- Supabase/Context7 снижают friction remote URL/OAuth;
- directories и inspectors могут тестировать Remote MCP без local setup;
- Remote path лучше связывается с аккаунтом, rate limits, analytics и будущей оплатой.

COUNTER-EVIDENCE:
- строить Remote раньше product evidence = инфраструктурное переусложнение;
- LayerPorter Growth OS уже требует shared core, а не fork.

DECISION: **YES, BUT AFTER LOCAL RELEASE/ACTIVATION EVIDENCE.**
Remote R0 — следующий сильный growth lever, но не блокер публикации локального MCP.

### H7. «HN/Reddit/Product Hunt надо запускать сразу»

EVIDENCE:
- способны дать всплеск внимания и backlinks;
- community recommendation реально влияет на выбор MCP.

COUNTER-EVIDENCE:
- generic MCP launches часто получают почти нулевую реакцию;
- слабый initial experience сжигает launch opportunity.

DECISION: **WAIT UNTIL DEMO + VERIFIED INSTALL.**

---

## 5. Pareto-план LayerPorter

### P0 — Truth + install readiness

После VERIFIED 0.1.1:

1. убрать противоречия npm README/status/repository;
2. canonical links только `OlegStrateg/lp-site`;
3. package/server/site version truth;
4. minimum 2 verified client paths;
5. copy-paste commands;
6. 3–5 outcome prompts;
7. реальный before/after;
8. telemetry, где технически возможно:
   - install/connect;
   - first success;
   - second successful workflow.

Почему P0: любой traffic до этого течёт в дырявую activation funnel.

### P1 — Canonical + downstream discovery

1. Official MCP Registry — после отдельной owner authorization;
2. Glama indexing/read-back;
3. mcpservers.org / mcp.directory / 1–2 крупные awesome lists;
4. automated long-tail submission только если почти бесплатна;
5. каждый реферальный канал получает отдельный source marker, где возможно.

Не делать KPI «сколько каталогов добавили».

### P1 — Machine-facing CRO

Переписать tool descriptions по формуле:

`ACTION + RESOURCE + WHEN TO USE + WHEN NOT TO USE + BOUNDARY/OUTPUT`

Пример направления:

`optimize_url_images`
не просто «optimize images from URL»,
а:
«Fetch a public HTTP(S) page, discover a bounded set of static raster <img> sources, recompress eligible JPEG/PNG/WebP images at original dimensions, and return verified temporary resources with before/after byte evidence. Use for fast static-page image optimization when browser-rendered currentSrc/LCP/CSS-background discovery is not required. Does not write to the website.»

Важно: descriptions не должны быть bloated. Registry audit показывает реальную проблему чрезмерных instructions/tool text.

### P1 — Human-facing activation

README/landing first screen:

`Optimize website images from your AI agent`

Дальше сразу:

`Give LayerPorter a URL → find eligible images → optimize → get before/after evidence`

Не начинать страницу с определения MCP.

Нужны 3 сценария:
1. «Analyze images on this URL and tell me the biggest savings opportunities.»
2. «Optimize the eligible images on this page and return the improved files.»
3. «Generate responsive variants for this hero image without upscaling.»

### P1 — Problem-first SEO

Первичные owner intents:
- optimize website images;
- compress website images;
- website image optimization;
- convert website images to WebP;
- WebP image optimization;
- responsive image generator / responsive images;
- srcset generator / srcset optimization;
- LCP image optimization;
- Core Web Vitals image optimization;
- reduce website image size.

Не создавать отдельную страницу на каждую словоформу. URL создаётся под самостоятельную задачу/capability.

Каждая страница:
`problem query → working tool/audit → quantified result → MCP/extension next step`.

### P2 — Community launch

После verified install и demo:

Reddit:
- не рекламный пост «наш MCP»;
- технический кейс «оптимизировали изображения сайта из Cursor/Claude; вот до/после и ограничения».

HN:
- Show HN только с live reproducible demo/evidence;
- title про проблему/результат, MCP вторично.

Product Hunt:
- отложить до Remote/free audit/Page Optimizer, где ценность понятна без developer setup.

### P2 — Creator / media loop

Pattern Context7 показывает, что YouTube/tutorial coverage может стать multiplier.

Но outreach только когда есть:
- 60–90 sec demo;
- 1-command install;
- exact client configs;
- before/after;
- public benchmark methodology;
- no inflated claims.

---

## 6. Метрики воронки

### Discovery
- impressions по problem queries;
- impressions по MCP queries;
- registry/profile views, если доступны;
- referral sessions по source;
- branded search.

### Activation
- install/connect completion;
- first successful tool call;
- first successful optimization;
- time-to-first-success;
- error rate.

### Retention
- second successful workflow;
- second session;
- 7d active MCP;
- workflows/user.

### Business
- MCP → LayerPorter account;
- account → Remote/API;
- paid conversion;
- cost per activated user.

Главная метрика локального этапа:

`FIRST SUCCESS RATE × SECOND SUCCESS RATE`

Не:
- stars;
- directory count;
- raw npm downloads.

---

## 7. Kill rules

STOP/RETEST канал, если после достаточной выборки:
- даёт clicks/views, но почти нет first success;
- требует ручной поддержки выше ценности;
- листинг нельзя атрибутировать и нет detectable lift;
- создаёт security/trust риск;
- требует отдельной архитектуры только ради присутствия.

Не строить отдельный core, hosted clone или client-specific fork ради distribution.

---

## 8. Следующий execution order

1. Завершить и externally VERIFY npm 0.1.1.
2. До Registry publication провести final metadata/tool-description review.
3. После отдельной owner authorization — Official Registry publish + read-back.
4. Проверить автоматическое/ручное появление в Glama.
5. Подключить 2 verified client paths.
6. Пересобрать README как activation landing.
7. Запустить первые problem-first SEO owner pages/tools.
8. Только затем community launch.
9. Через 14/30 дней сравнить channels по first/second success, а не по vanity metrics.

## Итог

Лучший рычаг LayerPorter — не «максимально раскидать MCP по каталогам».

Лучший рычаг:

`широкий problem demand → доказанный результат → frictionless MCP activation → автоматический правильный tool selection → repeat → Remote LayerPorter`.

Это соответствует общей Growth OS и даёт общий рост Web / Extensions / MCP / future AI, вместо отдельного мини-проекта «продвижение MCP».
