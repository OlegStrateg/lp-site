# LayerPorter Page Optimizer — AI/SEO дистрибуция, обнаружение и доверие

Статус: LP-077 / 2026-09-09

## 1. Главное разделение

Не смешивать четыре разных эффекта:

1. DISCOVERY — продукт/сервер можно найти в каталоге или через поиск.
2. USAGE — агент реально может подключить/вызвать инструмент.
3. ENTITY/TRUST — бренд подтверждается в независимых релевантных источниках.
4. SEO/LINK — страница получает индексируемую ссылку/упоминание, которое потенциально влияет на обычный поиск.

Наличие MCP или листинга само по себе НЕ считать доказанным Google ranking factor.

## 2. P0 — обязательные каналы после готовности MCP

### Official MCP Registry — P0
https://registry.modelcontextprotocol.io/
Ценность: canonical protocol registry / ecosystem discovery.
Проверять после публикации не только API presence, но и фактическую discoverability в интерфейсах/агрегаторах: в GitHub Issues уже есть кейсы, когда сервер есть в Registry API, но не находится в GitHub MCP UI search.
Метрики: indexed yes/no, query discoverability, installs/calls where available, referral.

### Claude Connectors Directory — P0
https://claude.com/connectors
Anthropic принимает собственные connectors на review. Для опубликованных connectors заявлена observability: active users, tool calls, directory rank, errors, latency.
Ценность: discovery + usage + measurable distribution.

### ChatGPT Plugins/Apps — P0
OpenAI в 2026 перенёс directory-discovery в Plugin directory; опубликованные apps могут распространяться через plugin page и потенциально surface по conversational context/use patterns/preferences.
Источники:
- https://help.openai.com/en/articles/11487775-apps-in-chatgpt
- https://openai.com/index/developers-can-now-submit-apps-to-chatgpt/
Ценность: discovery + native usage. Не считать гарантией рекомендаций.

### Smithery — P0/P1
https://smithery.ai/
Заявляет publish once/install anywhere, distribution и observability. На карточках поддерживаются Repository/Homepage/Documentation/Privacy.
Обязательно вставлять canonical website/homepage и docs, если поля доступны.

### Glama — P0/P1
https://glama.ai/
Open-source MCP submission через GitHub URL; автоматические quality/security/health checks; search/categories/recommendations. Поддерживает metadata через glama.json.
Обязательно: GitHub, homepage/docs, accurate categories, health.

### mcp.so — P1
https://mcp.so/
Submission через GitHub issue; указать name, description, features, connection information и сайт, если форма/issue допускает.

## 3. Skill-distribution — отдельный слой

Если мы создаём собственные полезные SKILL.md для Page Optimizer, их можно использовать как отдельную поверхность обнаружения.

### skills.sh — P1
https://skills.sh/
Крупный индекс installable agent skills. Discovery строится вокруг публичных repos/skills и install activity.

### Agent Skill Source — P1
https://www.agentskillsource.com/submit
Форма явно принимает GitHub Repository URL, short/full description, version, inputs/outputs/limitations, execution type including MCP Backed.
Здесь сайт/репозиторий/бренд оформлять консистентно.

### Дополнительные skill indexes — P2 / verify before submit
- officialskills.sh
- askill.sh и агрегаторы из актуальных registry lists
- Agent Mag skills registry
Правило: сначала проверить качество домена, индексацию, moderation, spam footprint и возможность canonical website link.

## 4. GitHub как самостоятельная поверхность доверия

Публичный MCP repo должен иметь:
- exact product name;
- website/homepage;
- concise category statement;
- screenshots/demo;
- install/connect examples;
- tool list + when to use;
- security/privacy model;
- benchmark/before-after;
- changelog/releases;
- license;
- issues/discussions;
- link back to canonical docs.

GitHub Topics использовать только релевантные: mcp, model-context-protocol, image-optimization, web-performance, core-web-vitals, website-audit и т.п. Не keyword-spam.

## 5. npm/package registries

Если есть installable package:
- package name должен совпадать с MCP/product naming;
- homepage → canonical LayerPorter page;
- repository → GitHub;
- bugs → Issues;
- keywords релевантные;
- README синхронизирован.

Цель: package discovery + consistent entity graph, а не «SEO backlink hack».

## 6. Собственный сайт — обязательный canonical hub

Минимальная архитектура после MVP:

- /page-optimizer/
- /website-image-optimizer/
- /mcp/
- /mcp/website-image-optimizer/
- /docs/page-optimizer/
- /docs/mcp/
- /benchmarks/image-optimization/
- /research/ (только реальные исследования)

Каждая внешняя карточка должна вести на один из canonical URL по её intent.

Не создавать десятки doorway pages.

## 7. Machine/agent readability

Проверять как usability, не как магический ranking signal:
- clean HTML;
- server-rendered/indexable core content;
- OpenAPI там, где есть API;
- MCP metadata/spec-compliant discovery;
- Markdown docs / Copy-for-LLM style docs where useful;
- llms.txt только как дешёвый compatibility/future-proof слой, НЕ как ranking claim;
- robots access для нужных search/AI crawlers согласно актуальным policies;
- sitemap/canonical/schema строго по реальному контенту.

## 8. External entity/trust distribution

Гипотеза, которую тестируем: независимые релевантные упоминания и сравнения могут усиливать вероятность понимания/цитирования бренда AI engines.

Разрешённые направления:
- профильные GitHub awesome lists;
- технические каталоги MCP/skills;
- реальные product directories с модерацией;
- developer communities;
- статьи/benchmarks, которые реально заслуживают ссылки;
- launch/release posts в релевантных сообществах;
- Reddit/форумы только через полезное участие, без link spam;
- integrations pages/partners, если реально интегрированы.

Запрещено:
- массовые SEO directories;
- покупные low-quality profiles ради ссылок;
- одинаковый спам-текст на сотнях площадок;
- fake reviews/mentions;
- обещание «listed everywhere» как moat.

## 9. Field Intelligence: что проверяем на форумах

Постоянный watchlist:
- r/TechSEO
- r/bigseo
- r/SEO
- AI SEO/GEO communities — только как гипотезы
- BlackHatWorld — hypothesis source, not authority
- GitHub Issues: modelcontextprotocol/registry, Lighthouse, Chrome Extensions, MCP clients
- developer Discord/communities конкретных registries

Ищем не советы, а:
- реальные referral/call/install numbers;
- indexing/discovery failures;
- directory ranking behavior;
- rejection/moderation reasons;
- crawler behavior;
- citation experiments with raw data;
- cases where listing had no effect.

## 10. Что уже видно из Field Intelligence 2026

- Исследования/обсуждения по llms.txt не подтверждают его как самостоятельный AI citation/ranking lever; держим как low-cost compatibility experiment.
- Есть controlled community experiments, где наборы цитируемых источников ChatGPT/Gemini/Google AI пересекаются слабо; поэтому visibility измеряется по каждому engine отдельно и многократно.
- Есть GitHub Issues по рассинхронизации official MCP Registry и downstream search UI; значит «опубликован» != «обнаруживается».

Уровень confidence для forum-derived тезисов: HYPOTHESIS/MEDIUM до собственного теста.

## 11. Карточка каждого размещения

Для каждого каталога вести строку:

`Площадка | URL | тип | submit path | website field | repo field | docs field | backlink/indexability | moderation | discovery | usage metrics | status | date | referral | AI mentions | decision`

Статусы:
- TARGET
- SUBMITTED
- APPROVED
- INDEXED
- DISCOVERABLE
- PRODUCING USAGE
- NO SIGNAL
- REJECTED
- REMOVE

## 12. Экспериментальная модель

До размещения фиксируем baseline:
- branded search;
- referral traffic;
- MCP calls/installs;
- AI mentions/citations по prompt set;
- cited URLs;
- directory query position where measurable.

После: 7/14/30/60 дней.

Decision: KEEP / IMPROVE PROFILE / RETEST / REMOVE / SCALE.

Таким образом мы строим не «100 ссылок», а измеряемую сеть discovery + usage + entity evidence.