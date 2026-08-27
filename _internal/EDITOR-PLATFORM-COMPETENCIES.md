# LayerPorter Editor Platform — компетенции и роли

Статус: рабочая матрица.
Цель: одна инфраструктура редактирования для сайта, Pinterest Downloader, Picture Converter и будущих Canva/Figma-интеграций. Отдельные SEO-входы используют один Editor Core.

## Правила

- Навыки включаются по этапам, не все сразу. Один ведущий специалист и 1–2 проверяющих.
- Роль — зона ответственности, а не обязательно отдельный человек: один агент может последовательно менять роль.
- Каждый этап заканчивается проверяемым артефактом. Мнение без прототипа, метрики или проверки не результат.
- SEO-страницы не создают отдельные редакторы: они конфигурируют один Editor Core.
- Базовые операции локальны; сервер и временное хранение — только для handoff и AI.

## Матрица специалистов

| Зона | Ведущая роль | Навыки и основы | Результат | Приёмка |
|---|---|---|---|---|
| Стратегия | Product architect | `ai-product`, `architecture` | MVP, job stories, north-star, ограничения | нет функции без измеримой задачи |
| UX | UX architect | внешний `mblode/agent-skills: ui-design`, `awareness-stage-mapper` | карта SEO-входов и единый Studio-flow | нужный режим открыт сразу; переключение без повторной загрузки |
| CRO | CRO specialist | `ab-test-setup`, `analytics-product`, `analytics-tracking` | воронка, события, гипотезы | у теста есть метрика и stop-condition; нет выдуманных uplift |
| UI | Design-system designer | внешний `ui-design`; `antigravity-design-expert` только после UX | токены, состояния, desktop/mobile | отличимость от шаблонного SaaS; показаны все состояния |
| Copy | UX writer | `avoid-ai-writing`, `awareness-stage-mapper` | H1, answer-first, CTA, ошибки и progress | конкретный текст без фальшивого social proof |
| SEO | Technical SEO architect | `ai-seo`, `astro` | route registry, metadata, canonical, sitemap, linking, Schema | отдельный intent на URL; нет doorway и duplicate pages |
| AI SEO | GEO specialist | `seranking/seo-skills: seo-geo` | цитируемые passages, entity/schema map | ответ самодостаточен; GEO измеряется после публикации |
| Editor frontend | Graphics frontend engineer | Fabric.js 7; spike Ascentspark React Image Editor | core, tool registry, layers, history, export | crop/resize/text/undo/export проверены реальным файлом |
| Image pipeline | Imaging engineer | Canvas, OffscreenCanvas, EXIF, ICC, memory budget | decode/resize/export, orientation, alpha/quality policy | большие файлы не блокируют UI; цвет и прозрачность не ломаются |
| Extensions | Chrome MV3 engineer | messaging, permissions, CSP, handoff contract | `EditJob v1`, source adapter, fallback | оба расширения открывают один Studio без путаницы URL/продуктов |
| Background removal | CV engineer | withoutBG; rembg baseline | alpha mask, restore/erase brushes, benchmark | волосы, мех, стекло, товар и иллюстрация; лицензия весов подтверждена |
| Object removal | Inpainting engineer | LaMa; IOPaint reference | erase flow, mask history, before/after | фиксированный тестовый корпус; операция обратима |
| Outpaint | Generative imaging engineer | Diffusers/IOPaint; только разрешённая модель | extend, prompt, variants, queue | качество, latency, стоимость, лицензия и abuse-policy подтверждены |
| Backend | Cloud/platform engineer | Workers/Pages Functions, R2, D1, Queues | jobs, signed upload, TTL, idempotency | безопасный retry; удаление по TTL; AI-worker изолирован |
| Security/privacy | Privacy engineer | `api-security-best-practices`, threat model | data-flow, consent, CSP, limits | local-first; AI явно сообщает об отправке файла |
| Лицензии | Model/license reviewer | upstream LICENSE + model cards | реестр кода, весов, моделей, атрибуций | MIT/Apache оболочка не скрывает NC/AGPL весов |
| Accessibility | Accessibility specialist | `accessibility-compliance-accessibility-audit`, `accesslint-*` | keyboard/focus/contrast/screen-reader audit | основной путь проходит клавиатурой; ошибки озвучиваются |
| QA | Acceptance engineer | `acceptance-orchestrator`, E2E, visual regression | smoke, screenshots, console/network audit | import → edits → export пройден реальным путём |
| Performance | Web performance engineer | `application-performance-performance-optimization` | budgets, profiling, long-task/memory checks | Studio не ухудшает SEO-страницы; тяжёлое вне main thread |
| Analytics | Product analyst | `analytics-tracking`, `ab-test-setup` | landing → import → edit → switch → export dashboard | события без изображений и PII |
| Delivery | DevOps/release engineer | GitHub Actions, rollback, cost alerts | CI gates, preview, production rollout | build + smoke + HTTP + screenshot; есть rollback |
| Store growth | Chrome Store specialist | `app-store-optimization` с адаптацией под Chrome | listing copy/screenshots/UTM | расширения не заимствуют обещания друг друга |

## Внешние навыки

Добавить только два набора:

1. `mblode/agent-skills: ui-design` — UX, marketing/product split, CRO, responsive и verification.
2. `seranking/seo-skills` — technical SEO и page-level GEO после публикации.

`seo-aeo-landing-page-writer` использовать лишь как чек-лист: генерация целиком сделает страницы одинаковыми.

## GitHub-основы

| Проект | Назначение | Решение |
|---|---|---|
| Fabric.js | Editor Core | основной фундамент, MIT |
| Ascentspark React Image Editor | быстрый spike UI/API | проверить активность и лицензию AI-весов |
| Filerobot Image Editor | зрелые crop/resize/text/history patterns | донор, не фундамент |
| miniPaint | слои, кисти, advanced editing | донор, не iframe |
| withoutBG | background removal | основной открытый кандидат после benchmark |
| rembg | baseline | код MIT; модель проверяется отдельно |
| LaMa | object removal | первый кандидат, Apache-2.0 |
| IOPaint | inpaint/outpaint workflow | reference; upstream архивирован, модели проверять |
| Diffusers | generative pipelines | инфраструктура, не лицензия модели |
| Landstro / astro-haze | SEO/a11y infrastructure | доноры, не визуальный шаблон |

## Что было упущено

1. Imaging engineering: EXIF, ICC/color, alpha, память и большие изображения.
2. Лицензии весов и датасетов отдельно от лицензии кода.
3. AI quality evaluation на фиксированном корпусе.
4. GPU economics, quotas и cost alerts.
5. Chrome MV3 handoff и разрешения.
6. Privacy/data-flow для временных файлов и AI.
7. Accessibility canvas-редактора и keyboard path.
8. Autosave, crash recovery, retry и idempotency.
9. Export correctness: цвет, прозрачность, ориентация.
10. Localization: отдельные intent/canonical/hreflang на язык.

## Порядок ролей

1. Product + SEO: jobs и route registry.
2. UX + CRO: landing-to-editor flow.
3. Graphics frontend + imaging: базовый Editor Core.
4. QA + accessibility + performance: production gate.
5. Extension engineer: единый handoff.
6. CV + license + privacy: background removal.
7. Generative imaging + platform + cost control: inpaint/outpaint.
8. GEO + product analyst: оптимизация по опубликованным данным.

## Definition of Done

- Реальный файл приходит с сайта/расширения, редактируется несколькими инструментами без повторной загрузки и скачивается корректно.
- Каждый tool URL отдаёт уникальный статический SEO-документ и сразу активирует нужный режим.
- Базовая обработка локальна; server data-flow прозрачен и ограничен TTL.
- Лицензии кода, весов и моделей задокументированы.
- Desktop/mobile подтверждены скриншотами; console/network errors отсутствуют.
- Build, smoke, HTTP и E2E проходят в CI; production имеет rollback.