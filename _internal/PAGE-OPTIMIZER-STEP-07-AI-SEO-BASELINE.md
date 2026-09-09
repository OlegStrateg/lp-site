# LP-077 — Шаг 7/30: Baseline AI/SEO visibility до запуска

Дата: 2026-09-09
Статус: DONE — measurement baseline fixed; cross-engine live runs require each engine/interface and are tracked separately

## Цель
Зафиксировать исходную систему измерения до публикации LayerPorter Page Optimizer / Website Image Optimizer, чтобы после MCP/каталогов/сайта можно было доказать или опровергнуть влияние на:
- обычный поиск;
- AI answer engines;
- MCP discovery;
- брендовые упоминания;
- цитируемые URL;
- referrals / installs / tool calls.

## Ключевое разделение
Не смешивать три поля конкуренции:
1. SEARCH INTENT — обычная поисковая выдача/индексируемые страницы.
2. AI ANSWER VISIBILITY — какие бренды/источники рекомендует конкретный AI engine.
3. MCP / AGENT DISCOVERY — какие MCP/skills/connectors доступны и находятся в реестрах/клиентах.

Победа в одном поле не считается победой в двух остальных.

## Исходный публичный web baseline — 2026-09-09
По свежей проверке общих интентов вокруг website image optimization / WebP / AVIF / Core Web Vitals в публичной выдаче представлены:
- Cloudflare — image optimization / modern formats / responsive delivery;
- corewebvitals.io — LCP/image/CWV research and optimization guidance;
- специализированные image optimization сайты и статьи;
- generic MCP image optimizers, включая piephai/mcp-image-optimizer;
- Official MCP Registry уже содержит image-related MCP servers.

LayerPorter Page Optimizer / Website Image Optimizer в этой публичной baseline-проверке не зафиксирован как заметный самостоятельный источник/бренд по целевым небрендовым интентам. Это и есть исходная точка, а не негативный вывод о будущем потенциале.

## Канонический prompt/query set

### Кластер A — общий коммерческий интент
A1. best tool to optimize images for a website
A2. optimize images for website without losing quality
A3. website image optimizer
A4. bulk optimize website images
A5. optimize all images on a web page
A6. automatically optimize website images

### Кластер B — performance / Core Web Vitals
B1. how to optimize images for Core Web Vitals
B2. fix LCP image automatically
B3. reduce page weight from images
B4. optimize hero image for LCP
B5. find oversized images on a website
B6. generate responsive images and srcset automatically

### Кластер C — format intent
C1. best tool to convert website images to WebP
C2. WebP vs AVIF for website performance
C3. automatically choose WebP or AVIF
C4. batch convert website images to AVIF and WebP
C5. preserve quality while reducing website image size

### Кластер D — agent/MCP intent
D1. MCP server for image optimization
D2. MCP tool to optimize website images
D3. AI agent that optimizes website images
D4. MCP for Core Web Vitals image optimization
D5. AI tool that audits and fixes website images
D6. agent that can optimize a web page automatically

### Кластер E — broader Page Optimizer intent
E1. AI website auditor that fixes issues automatically
E2. AI agent for website performance optimization
E3. automatically fix Core Web Vitals issues
E4. AI tool that audits SEO and performance and applies fixes
E5. safe AI website optimization agent
E6. autonomous website optimization with rollback

## Движки / поверхности измерения
Измерять отдельно:
- ChatGPT / ChatGPT Search;
- Claude;
- Gemini / Google AI Mode / AI Overviews where surfaced;
- Perplexity;
- Copilot;
- обычный Google Search;
- Official MCP Registry;
- Claude Connectors Directory;
- ChatGPT Plugin Directory;
- Smithery;
- Glama;
- mcp.so;
- GitHub search;
- npm search;
- relevant skill directories.

## Важное ограничение измерения
В этой исследовательской сессии нет единого доверенного интерфейса, который позволял бы запросить все внешние AI engines из одного и того же controlled environment. Поэтому нельзя подменять реальные Claude/Gemini/Perplexity runs веб-поиском и называть это их baseline.

Правило:
- публичный web/search baseline фиксируется сейчас;
- для каждого AI engine live baseline фиксируется отдельно в его доступном интерфейсе/API/observability surface до submission или сразу при появлении доступа;
- отсутствие такого run маркируется `NOT MEASURED`, а не `NO VISIBILITY`.

## Что записывать по каждому run
`date | engine | locale | country | signed-in/out context if relevant | prompt_id | exact_prompt | brand_mentioned | recommendation_position | cited_domains | cited_urls | LayerPorter_mentioned | LayerPorter_url_cited | competitors | answer_type | notes | screenshot/raw evidence`

## Метрики

### AI Mention Rate
число prompt-runs, где LayerPorter упомянут / все prompt-runs.

### AI Recommendation Rate
число prompt-runs, где LayerPorter рекомендован как решение / все prompt-runs.

### Citation Rate
число prompt-runs с citation на layerporter.com / все prompt-runs.

### Citation Share
цитирования layerporter.com / все цитирования по нашему prompt set.

### Competitor Share of Voice
частота появления каждого конкурента по тому же набору prompts.

### Discovery Rate
число каталогов/поисковых поверхностей, где продукт реально находится по целевому query / все целевые поверхности.

### Usage Conversion
tool calls / installs / active users / referrals после discoverability, где метрика доступна.

## Повторяемость
Один ответ AI не считается сигналом.
Минимум после запуска:
- 3 runs на ключевой prompt в каждом engine;
- одинаковая формулировка baseline vs follow-up;
- отдельно EN baseline, затем локали только если есть коммерческая причина;
- 7 / 14 / 30 / 60 day comparison.

Для нестабильных движков хранить raw evidence/screenshot и source set.

## Контрольные конкуренты baseline
Не фиксировать вечный список заранее. На каждом engine/query сохранять фактически показанные бренды.

Начальный watchlist по текущей публичной выдаче/экосистеме:
- Cloudflare Images;
- Cloudinary;
- ImageKit;
- ShortPixel;
- GetWebP;
- piephai/mcp-image-optimizer;
- Cleanor MCP;
- другие реальные бренды, которые появляются в конкретном engine.

## Что считать доказанным ростом
Не `нас один раз показал ChatGPT`.

Минимум одно из:
1. устойчивый рост Mention/Recommendation/Citation Rate на повторяемом prompt set;
2. появление в каталоге + фактическая discoverability + tool usage/referral;
3. рост indexed search visibility по целевым запросам;
4. новые независимые cited domains/mentions;
5. статистически/операционно заметный branded/referral/tool-call lift относительно baseline.

## Что НЕ считать доказательством
- одна случайная цитата;
- собственная страница попала в индекс;
- наличие llms.txt;
- наличие schema;
- публикация MCP без discoverability;
- листинг в 20 каталогах без usage/referral;
- изменение ответа после изменения prompt wording;
- forum anecdote без raw data.

## Measurement ledger
Статусы по engine/prompt:
- NOT MEASURED
- BASELINE CAPTURED
- POST-LAUNCH CAPTURED
- POSITIVE DELTA
- NO DELTA
- NEGATIVE DELTA
- INCONCLUSIVE

## Pareto-набор для регулярного мониторинга
Не гонять все 30 prompts ежедневно.

P0 sentinel prompts:
- A1 best tool to optimize images for a website
- A5 optimize all images on a web page
- B2 fix LCP image automatically
- B6 generate responsive images and srcset automatically
- D2 MCP tool to optimize website images
- D5 AI tool that audits and fixes website images
- E2 AI agent for website performance optimization
- E6 autonomous website optimization with rollback

Их достаточно для раннего сигнала. Полный набор — на 14/30/60 day checkpoints.

## Решение шага 7
Baseline measurement contract зафиксирован. До запуска LayerPorter не выдавать отсутствие упоминания в непроверенном AI engine за факт. После публикации сравнивать только одинаковые prompts и отдельные engines.

Следующий шаг: 8/30 — построить evidence-based карту trust/entity signals: какие внешние упоминания, профили, GitHub/npm/docs/benchmarks/research/community placements реально создают независимое подтверждение бренда, какие из них могут быть индексируемыми/цитируемыми, и какие являются пустым SEO-спамом.