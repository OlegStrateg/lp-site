# LP-077 — Шаг 6/30: Карта дистрибуции, обнаружения и доверия

Дата: 2026-09-09
Статус: DONE

## Цель
Проверить реальные поверхности, где LayerPorter Page Optimizer / Website Image Optimization MCP может быть опубликован, найден, установлен или вызван, и отделить полезную дистрибуцию от каталогового спама.

## Каналы P0/P1

### Official MCP Registry — P0
Источник: https://registry.modelcontextprotocol.io/docs
Статус: VERIFIED TARGET.
Роль: канонический реестр MCP ecosystem.
Требование: публиковать только после готового server metadata/package и security gate.
Отслеживать не только факт presence, но downstream discoverability.

### Claude Connectors Directory — P0
Источник: https://claude.com/connectors
Статус: VERIFIED TARGET.
Submission path: Submit your own connector / review.
Ценность: native discovery + usage.
Отдельная сильная сторона: observability владельца — active users, tool calls, directory rank, errors, latency.

### ChatGPT Plugins / Apps — P0
Источники:
- https://help.openai.com/en/articles/20001256/
- https://help.openai.com/en/articles/11487775-apps-in-chatgpt
- https://openai.com/index/developers-can-now-submit-apps-to-chatgpt/
Статус: VERIFIED TARGET.
Роль: Plugin Directory — primary discovery surface; app может использовать MCP-backed tools.
Нельзя считать публикацию гарантией recommendation/surfacing.
Обязательны privacy/terms и соответствие app submission requirements.

### Smithery — P0/P1
Источник: https://smithery.ai/
Статус: VERIFIED TARGET.
Publish once / install anywhere / observability.
На карточках и профилях использовать canonical website/docs/repository/privacy, где доступны.

### Glama — P0/P1
Источник: https://glama.ai/mcp/faq
Статус: VERIFIED TARGET.
Submission: GitHub repo → Add MCP Server.
После подачи Glama выполняет license/security/health checks и добавляет сервер в search/categories/recommendations.
Поддерживает `glama.json` для metadata/category/env/build.

### mcp.so — P1
Источник: https://mcp.so/
Статус: VERIFIED TARGET.
Submission через GitHub issue; обязательны name/description/features/connection information.
Ценность: secondary discovery, не source of truth.

### skills.sh — P1
Источники: https://www.skills.sh/ , https://www.skills.sh/docs
Статус: VERIFIED TARGET для собственных skills.
Discovery/ranking основаны на aggregated install telemetry.
Использовать только для реально полезных LayerPorter skills, не для дублирования MCP-карточек.

### Agent Skill Source — P1
Источник: https://www.agentskillsource.com/submit
Статус: VERIFIED TARGET.
Форма принимает GitHub repo, descriptions, version, inputs/outputs/limitations, execution type включая MCP Backed, supported runtimes и permissions.

## GitHub / npm — обязательные entity surfaces

### GitHub
Публичный repo должен иметь:
- exact product name;
- canonical website/homepage;
- docs;
- concise category statement;
- install/connect examples;
- screenshots/demo;
- security/privacy model;
- benchmark/before-after;
- changelog/releases;
- license;
- Issues/Discussions;
- relevant Topics only.

### npm
Если публикуется package:
- package name согласован с product naming;
- homepage → canonical LayerPorter URL;
- repository → GitHub;
- bugs → Issues;
- README синхронизирован;
- keywords без spam.

## Канонический сайт как hub

Каждая внешняя карточка ведёт не просто на homepage, а на наиболее релевантный intent URL:
- `/page-optimizer/`
- `/website-image-optimizer/`
- `/mcp/`
- `/mcp/website-image-optimizer/`
- `/docs/page-optimizer/`
- `/docs/mcp/`
- `/benchmarks/image-optimization/`

Где форма позволяет указать Homepage/Website/Docs/Repository/Privacy — заполнять все релевантные поля консистентно.

## Матрица ценности

Для каждого размещения фиксировать отдельно:
- discovery value;
- usage value;
- entity/trust value;
- SEO/link value;
- moderation quality;
- spam risk;
- analytics/observability;
- website field;
- docs field;
- repository field;
- privacy field.

## Статусы размещения

`TARGET → SUBMITTED → APPROVED → INDEXED → DISCOVERABLE → PRODUCING USAGE → REFERRAL/CITATION`.

Публикация без discoverability не считается успешной дистрибуцией.

## Pareto-порядок

1. Official MCP Registry.
2. Claude Connectors.
3. ChatGPT Plugins/Apps.
4. Smithery.
5. Glama.
6. GitHub + npm.
7. mcp.so.
8. skills.sh + Agent Skill Source только для собственных skills.
9. Остальные каталоги — только после проверки индексации, качества и отсутствия spam footprint.

## Что запрещено

- массовые low-quality SEO directories;
- одинаковый текст в сотнях каталогов;
- fake reviews/mentions;
- покупные profile links;
- считать llms.txt/schema/MCP прямым ranking factor;
- считать submission успехом без проверки INDEXED/DISCOVERABLE/USED.

## Метрики

Baseline до публикации:
- branded search;
- referral traffic;
- MCP installs/calls;
- AI mentions/citations по фиксированному prompt set;
- cited URLs;
- directory search position где измеримо.

После: 7 / 14 / 30 / 60 дней.

Решение: KEEP / IMPROVE PROFILE / RETEST / REMOVE / SCALE.

## Итог шага

Мы строим не «максимум ссылок», а максимальную сеть:
`DISCOVERY + NATIVE USAGE + CONSISTENT ENTITY + MEASURABLE REFERRAL`.

Следующий шаг: 7/30 — baseline AI/SEO visibility и измерительная система до публикации: какие запросы, какие движки, какие позиции/упоминания/цитаты фиксируем и как исключаем ложные выводы.