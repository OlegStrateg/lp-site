# LayerPorter — единый аудит страницы: прогресс

Статус: IN DEVELOPMENT / NO MERGE / NO DEPLOY
Ветка: `feat/unified-page-audit`
База: `e982caffb8a53e0dfde135d0d7610cd9fd459a89`
Контрольная страница U1: `https://layerporter.com/convert/webp-to-jpg/`

Этот файл — единый журнал реализации сценария «аудит → исправленная страница → проверенный результат». Он не является доказательством production-готовности сам по себе.

## Обязательные проверки до реализации

### 1. Фактическое состояние

- `master` на старте: `e982caffb8a53e0dfde135d0d7610cd9fd459a89`.
- `feat/unified-page-audit` до начала работы отсутствовала; создана от точного `master`.
- Проверены открытые PR. Активные контуры Audio, PostingBoard/agent, CRO Audit welcome и исторический Picture Converter не используются как база и не перезаписываются.
- Astro работает в `output: static`; реальный серверный путь сайта уже существует через Cloudflare Pages Functions в `functions/` — новый серверный фреймворк не нужен.
- В `packages/` уже есть `image-core`, `image-optimizer-mcp` 0.1.0 и отдельный `layerporter-agent`. Опубликованную версию MCP не изменяем.
- Локальная среда текущего исполнителя не может клонировать GitHub из-за отсутствия DNS-доступа. Код ведётся через GitHub API; сборку и preview необходимо подтверждать CI/доступным браузерным контуром, а не считать статический diff проверкой.

### 2. Спрос и назначение страницы

Для U1 не создаётся новый индексируемый URL. Используется существующая точная страница `/convert/webp-to-jpg/` с однозначным намерением «WebP → JPG» и реальным пользовательским результатом — скачиваемым JPG. Это позволяет проверить аудит и изменения без каннибализации новой страницей.

### 3. Качество результата

Приёмка U1 требует одновременно:

- четыре раздела аудита: SEO, готовность к ИИ-поиску, CRO, изображения/производительность;
- evidence на каждую находку и честный статус покрытия;
- 3–5 общих приоритетов без дублей;
- ограниченный diff по выбранным подтверждённым проблемам;
- сборка/preview;
- desktop/mobile;
- основной путь WebP → JPG → реальный файл → декодирование → download;
- console/network и ресурсы;
- повторная проверка после изменений;
- применимый/revertable patch.

HTTP 200, toast или зелёная сборка не считаются проверкой пользовательского результата.

## Карта «готово / переиспользуем / добавить»

### Готово и переиспользуем

- Astro static site + существующие layouts/components/content collections.
- Cloudflare Pages Functions как существующий серверный контур.
- `packages/image-core` — детерминированные операции изображений.
- `@layerporter/image-optimizer-mcp@0.1.0` — семь ограниченных MCP tools и `resource_link → resources/read`; опубликованную 0.1.0 не переписываем.
- `ConverterWidget.astro` + `webpToJpg.worker.ts` — настоящий клиентский WebP → JPG путь с magic-byte проверкой, лимитами, декодированием, JPEG output и download.
- Существующая SEO-разметка exact-converter: canonical, SoftwareApplication, HowTo, FAQ, Breadcrumb.
- Существующая аналитика и privacy/network guard.
- `packages/layerporter-agent` содержит полезные паттерны HTTP/Responses/observability, но это другой PostingBoard/runtime-контур; не переименовываем его в page audit и не связываем автоматически с production.

### Необходимо добавить

1. Единый проверяемый формат `finding/evidence/coverage/change/output`.
2. Детерминированный single-page audit core без «магического балла».
3. Bounded URL ingestion для аудита одной страницы с SSRF-защитой, лимитами размера/редиректов/времени.
4. Cloudflare Pages Function для реального web execution path.
5. UI состояния: URL → progress → top issues → details → selected fixes → result/outputs.
6. Repo-mode: локальная/CI рабочая копия, выбранные изменения, build/preview, patch с базовым SHA.
7. Before/after browser verification и реальные файлы.
8. U2 portability для URL-only, U3 повторяемость/выдача, U4 публичный интерфейс.

## Контрольная страница U1

`/convert/webp-to-jpg/` выбрана потому что:

- существующая и уже индексируемая — новый SEO URL не нужен;
- не пересекается с текущими активными PR по Audio/CRO welcome/Picture Converter;
- имеет реальный измеримый результат: входной WebP и скачиваемый JPG;
- использует общий `ConverterLayout` и `ConverterWidget`, поэтому можно проверить регрессии общего шаблона на второй странице;
- текущий код явно ограничивает вход 30 MB / 6000×6000, проверяет WebP magic bytes и генерирует `image/jpeg` в worker.

Baseline production зафиксирован до изменений: canonical совпадает с URL, H1 и answer-first описывают WebP → JPG и client-side режим; внешний HTML не содержит обычных `<img>`-ресурсов для контента страницы. Browser-only и file-conversion свойства требуют отдельного smoke и пока не объявляются проверенными.

## Источники и происхождение методики

В код проекта чужие коллекции целиком не копируются. Используются только проверенные принципы и чек-листы.

| Источник | Зафиксированный commit | Лицензия | Использование |
| --- | --- | --- | --- |
| AgriciDaniel/claude-seo, `seo-images` | `92795530b4cc92c6bf7a2435b82c15b003e71181` | MIT | evidence-first image checks; alt/size/format/context; без установки коллекции |
| Lawrence Hitches / StudioHawk, `technical-seo-audit` | `ec5966603743267f6e2b01287a419097f459a8b8` | MIT | разделение observation/evidence/priority/limits; без универсальных SEO-порогов |
| Corey Haines, marketingskills (`cro`, `seo-audit`, `ai-seo`) | `5b2c0007766c6a1cf1d53fd8fc73e979e0821022` | MIT | CRO/AI-readiness вопросы и presentation; не выдавать гипотезу за измерение |
| Microsoft/playwright-cli | `655530f6d0dc71a0d6bf46ae165877d3c7311099` | Apache-2.0 | методика real-browser snapshot/interactions/console/network; код не vendored |
| osmanates/claude_skills `clone-website` | `a136dd7143c4a255f69bd202af32386833bf3601` | LICENSE в корне не найден | только общая методика изучения styles/assets/states; ничего не копируется |

## Этапы и SHA

| Этап | Статус | SHA | Проверки | Ограничения / следующий шаг |
| --- | --- | --- | --- | --- |
| 1. База и карта переиспользования | READY | заполняется этим коммитом | Git/master/PR/docs/runtime/source provenance | далее audit-core |
| 2. Unified audit core | TODO | — | unit + deterministic fixtures | — |
| 3. Repo fixed-page U1 | TODO | — | build + preview + browser/file smoke | — |
| 4. URL-only U2 | TODO | — | simple + complex portability cases | — |
| 5. Before/after verification | TODO | — | desktop/mobile/console/network/output | — |
| 6. Output bundle U3 | TODO | — | clean repeatable run | — |
| 7. Site UI U4 | TODO | — | end-to-end interface path | — |
| 8. Docs/release prep | TODO | — | release sequence/rollback | no merge/deploy/publish without owner permission |

## Запреты этого контура

- не менять опубликованный MCP 0.1.0;
- не строить полный crawler сайта;
- не добавлять heatmaps, billing, массовую систему деплоя;
- не придумывать спрос, трафик, конверсию, AI citations или гарантии CWV;
- не считать отсутствующие данные нулём;
- не делать merge, production deploy или npm/Registry publish без отдельного разрешения владельца.
