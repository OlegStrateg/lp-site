# МИТ — PAGE OPTIMIZER — ШАГ 7/30

Дата: 2026-09-09
Статус: DONE
Ветка: `research/LP-077-page-optimizer-base`
Issue: #182 / LP-077

## Что сделано
Зафиксирована baseline-система измерения AI/SEO visibility до запуска Page Optimizer / Website Image Optimizer.

Разделены три независимых поля:
1. Search intent visibility.
2. AI answer visibility.
3. MCP/agent discovery.

## Канонический prompt set
Созданы 5 кластеров:
- общий коммерческий intent;
- performance/Core Web Vitals;
- formats WebP/AVIF;
- MCP/agent intent;
- broader Page Optimizer intent.

Всего 30 базовых prompts + 8 sentinel prompts для регулярного Pareto-monitoring.

## Метрики
- AI Mention Rate;
- AI Recommendation Rate;
- Citation Rate;
- Citation Share;
- Competitor Share of Voice;
- Discovery Rate;
- Usage Conversion.

## Движки/поверхности
Измерять отдельно:
ChatGPT, Claude, Gemini/Google AI, Perplexity, Copilot, Google Search, Official MCP Registry, Claude Directory, ChatGPT Plugin Directory, Smithery, Glama, mcp.so, GitHub, npm, skill directories.

## Важная защита от ложных выводов
Нет единого controlled интерфейса ко всем внешним AI engines в текущей сессии. Поэтому web search нельзя выдавать за Claude/Gemini/Perplexity baseline.

Статус непроверенного engine = `NOT MEASURED`, а не `NO VISIBILITY`.

## Публичный web baseline
По свежей публичной выдаче сейчас заметны крупные инфраструктурные игроки, специализированные CWV/image optimization источники и существующие image MCP. LayerPorter пока не зафиксирован как заметный небрендовый источник по целевым интентам — это исходная точка измерения.

## Repeatability
- минимум 3 runs на ключевой prompt/engine;
- exact prompt сохраняется;
- одинаковый baseline/post-launch wording;
- checkpoints 7/14/30/60 days;
- raw evidence/screenshot сохраняется.

## Что считать доказанным ростом
Только устойчивый рост mention/recommendation/citation/discovery/usage или search/referral visibility относительно baseline.

## Что не считать
Одна цитата, llms.txt, schema, сам факт MCP listing, массовые каталоги без usage, forum anecdote без raw data.

## Git
Research file commit: `3a3ffd330e763e7e49c134c33025ad5ddb7836a9`.

## Следующий шаг
8/30 — evidence-based trust/entity map: независимые упоминания, профили, GitHub/npm/docs/benchmarks/research/community placements, их indexability/citation value и spam risk.