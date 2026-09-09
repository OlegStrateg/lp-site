# LayerPorter Page Optimizer — AI Visibility Ledger

Статус: baseline template / LP-077 / 2026-09-09

## Назначение
Единый журнал повторяемых замеров AI/Search/MCP visibility до и после публикации.

## Поля записи
`date | engine | surface | locale | country | prompt_id | exact_prompt | run_number | LayerPorter_mentioned | recommended | recommendation_position | cited_domains | cited_urls | LayerPorter_url_cited | competitors | answer_type | evidence_location | notes | status`

## Статусы
- NOT MEASURED
- BASELINE CAPTURED
- POST-LAUNCH CAPTURED
- POSITIVE DELTA
- NO DELTA
- NEGATIVE DELTA
- INCONCLUSIVE

## Sentinel set
- A1 — best tool to optimize images for a website
- A5 — optimize all images on a web page
- B2 — fix LCP image automatically
- B6 — generate responsive images and srcset automatically
- D2 — MCP tool to optimize website images
- D5 — AI tool that audits and fixes website images
- E2 — AI agent for website performance optimization
- E6 — autonomous website optimization with rollback

## Правила
1. Exact prompt не менять между baseline и follow-up.
2. Минимум 3 runs на sentinel prompt/engine на контрольной точке.
3. Engine/surface измерять отдельно; не переносить результат одного движка на другой.
4. Сохранять raw answer/screenshot/source set.
5. NOT MEASURED не трактовать как отсутствие visibility.
6. Один случайный ответ не считать трендом.
7. Follow-up: 7/14/30/60 days после публикации/крупного distribution event.
