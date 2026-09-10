# MCP: ревью перед публикацией и задание для исполнительского чата

Дата: 2026-09-10.
Репозиторий: OlegStrateg/layerporter-site.
Ветка, указанная владельцем: **feat/LP-095-artifact-url-ingestion**.
Head при проверке: [ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb](https://github.com/OlegStrateg/layerporter-site/commit/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb).
Scope: packages/image-optimizer-mcp и связанное packages/image-core.

Статус: **ограниченное ревью исходников, НЕ runtime/security certification**. Код, npm pack, установка и клиентский smoke здесь не запускались. В этом изменении сохранены документы; MCP-ветка не изменялась. Перед исправлением сверить актуальный head: другой чат продолжает работу.

## Решение

Сохранить текущую схему resource_link → resources/read. Сначала закрыть расхождение публичных обещаний с URL ingestion, воспроизвести чистую установку и проверить реальную выдачу изображения. После этого публиковать существующий узкий продукт. Расширение, browser crawling, PageSpeed-аудит и автоматическое изменение сайта не являются зависимостями первого выпуска.

## Подтверждённые по коду замечания

### M1 — P1: публичное описание отстаёт от реально зарегистрированных инструментов

[README Safety boundary](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/README.md#L71) исключает remote URL fetch, а Not yet included оставляет remote URL ingestion на будущее. [distribution-manifest.json](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/distribution/distribution-manifest.json#L11) сообщает toolCount=5 и отсутствие network fetches (строка 27).

При этом [server.js:139](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/src/server.js#L139) регистрирует analyze_url_images и optimize_url_images. [url-ingestion.js:108](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/src/url-ingestion.js#L108) вызывает secureFetch для HTML и изображений. В server всего семь зарегистрированных tools.

Последствие: пользователь/каталог выбирает продукт по неверной модели обработки и сетевого доступа; новые инструменты не отражены в установочных материалах.

Рекомендация: синхронизировать README, distribution manifest, server.json/продуктовые страницы/карточки там, где они описывают capabilities. Чётко разделить caller-provided buffer и URL mode, доступ к внешним хостам из среды MCP, временную запись артефактов и отсутствие записи в production. Не называть пакет «без сетевых запросов».

Приёмка: tools/list реального клиента совпадает с опубликованным списком; в распространяемых материалах нет старого обещания no network fetches; URL mode не обещает браузерные измерения.

### M2 — P1 для установки из исходников: README пропускает синхронизацию общего ядра

[README:37–46](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/README.md#L37) предлагает install → release:preflight → test → node src/server.js.
[tools.js:1](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/src/tools.js#L1) импортирует ./image-core/index.js. Эта генерируемая копия создаётся [sync-image-core.mjs](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/scripts/sync-image-core.mjs#L5) из соседнего packages/image-core/src. В просмотренном дереве исходников копии нет.

[package.json scripts](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/package.json#L22) запускает sync только в prepack; test его не вызывает. [release-preflight.mjs](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/scripts/release-preflight.mjs#L1) проверяет метаданные и лицензию, но не создаёт core.

Сценарий: новый checkout без результатов предыдущего npm pack, выполнение README по порядку — импорт отсутствующей копии core должен завершиться ошибкой. Это вывод по коду; фактический лог ещё требуется.

Рекомендация: явно добавить npm run sync:core в source setup до тестов/запуска либо обеспечить эквивалентный lifecycle. Проверить также чистый tarball: наличие prepack означает, что дефект source-инструкции **не доказывает** поломку будущего npm-пакета.

Приёмка: чистая среда выполняет README без скрытого подготовительного шага; отдельно npm pack → установка tarball вне monorepo → stdio handshake → tools/list → вызов.

### M3 — P2: общий byte budget URL-загрузки проверяется до await и может быть превышен

[url-ingestion.js:137–140](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/src/url-ingestion.js#L137) проверяет acceptedImageBytes, затем ожидает inspectImage и лишь после увеличивает счётчик. mapBounded запускает два worker по умолчанию.

Сценарий: уже принято 16 MiB, два параллельных изображения по 8 MiB проходят проверку против лимита 24 MiB до завершения inspectImage; после обоих await итог может стать 32 MiB. Между проверкой и резервированием нет общей синхронизации. Воспроизведение тестом пока не выполнено.

Рекомендация: резервировать бюджет до await с освобождением при ошибке либо выполнять финальную атомарную проверку и увеличение непосредственно перед сохранением результата. Тест должен детерминированно перекрыть два inspect, а не зависеть от случайного timing.

Дополнение: response.body полностью загружается до проверки общего лимита. Текущий total_image_byte_budget ограничивает принимаемый набор, а не гарантированный общий сетевой трафик. Не обещать второй смысл без соответствующего контроля загрузки.

Приёмка: принятые/учтённые bytes никогда не превышают заданный лимит при параллельной обработке; отказ одного элемента не ломает остальные.

## Контракт артефактов: что сохраняем и чего не нужно переделывать без причины

Код [artifact-result.js](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/src/artifact-result.js#L49) публикует ресурс только для ACCEPT; REJECT остаётся диагностикой. Основной результат содержит текстовый JSON и resource_link, без байтов изображения в этом тексте.
[ArtifactStore](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/src/artifact-store.js#L117) отдаёт URI, имя, MIME, size, SHA-256, expiresAt.
[resources/read](https://github.com/OlegStrateg/layerporter-site/blob/ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb/packages/image-optimizer-mcp/src/server.js#L40) отдаёт blob base64 и _meta с hash/size/expiry, а store перед чтением проверяет длину и SHA-256.

Status, размеры и экономия могут находиться рядом в JSON результата оптимизации; **отсутствие этих полей в самом resource_link не является само по себе дефектом MCP или нарушением описанной владельцем схемы**. Не менять весь протокол ради дублирования полей. Нужна однозначная связь каждого результата batch/variant с его artifact URI и проверяемая форма метаданных для клиента.

Рекомендуемый пользовательский вид: имя → размер/экономия → предпросмотр → «Скачать оптимизированную версию». resource URI остаётся технической частью. Сам сервер не может гарантировать, что любой клиент автоматически прочитает ресурс и нарисует кнопку; документировать реально проверенные клиенты и доступный fallback.

Из кода: TTL по умолчанию 30 минут, до 50 артефактов, 50 MiB общего store и 10 MiB на артефакт. Удаление выполняется на операциях cleanup/dispose, это **не обещание гарантированного физического удаления ровно через 30 минут**. При перезапуске процесса in-memory index не восстанавливается. Отразить временную доступность и не обещать постоянную ссылку.

Ресурсная схема убирает байты из первоначального tool text. Но resources/read возвращает base64; расход контекста дальше зависит от клиента. Не рекламировать абсолютное «бинарник никогда не попадёт в контекст».

## Минимальный release smoke

Исполнитель использует искусственные/разрешённые fixtures, сохраняет логи в папке проекта, не пользовательские приватные картинки.

1. Чистая установка из tarball, без соседнего monorepo/core и dev-артефактов.
2. Реальный stdio клиент: initialize → tools/list → optimize_image → получить ACCEPT и URI.
3. resources/read этого URI → декодировать blob → сверить SHA-256, bytes, MIME и размеры → открыть изображение обычным просмотрщиком.
4. Прогнать один batch и responsive variants: все URI относятся к правильным исходникам/размерам; основной tool text не содержит Buffer/base64 payload.
5. REJECT: понятная причина, исходник не потерян, нет выдачи не прошедшего проверку результата как улучшенного.
6. Истёкший/неизвестный URI, повторное чтение, лимит store — понятные ошибки и предсказуемая доступность.
7. URL mode на контролируемой публичной тестовой странице: результат частичного успеха и отсутствие картинок; сетевые ошибки не выдаются за оптимизацию.
8. Выполнить имеющиеся meaningful тесты URL security boundary: private/loopback IPv4/IPv6, redirects к запрещённым адресам, DNS/pinning, timeout, byte limits. Наличие secureFetch и annotations само по себе не доказывает безопасность. Не тестировать чужую инфраструктуру на уязвимости.
9. До внешней публикации сверить точную версию/identity/пакуемые файлы и отсутствие секретов в артефакте.
10. После авторизованной публикации — установка точной публичной версии и повтор успешного файла; Registry проверяется отдельно по точному server name/version.

Для первой публикации достаточно фактически проверенного stdio-клиента и честно описанной совместимости. Не блокировать выпуск ожиданием поддержки всеми чатами.

## Продуктовая честность и продвижение

URL mode сейчас http_fast: читает статический HTML, выбирает ограниченный набор img, пересжимает исходные размеры. Это полезная работа, но не полный сбор browser assets, CSS backgrounds, JS lazy content, rendered size/currentSrc или измерение LCP. ACCEPT — прохождение реализованных guards; не гарантия визуальной идентичности или роста SEO/CWV.

Публичная страница должна показывать один воспроизводимый before/after, фактическую экономию конкретного примера, ограничения, установку, документацию, поддержку, владельца и статус версии. Официальный пакет может быть проприетарным: не называть его open source и не обещать публичный исходник, пока его нет. Доступность source/hosted transport и правила каждого каталога сверяются перед подачей; не менять transport ради всех каталогов до первого успешного onboarding.

Сначала исправления и smoke, затем пакет/страница/доки, затем применимые Registry и каталоги. Расширение «проверить страницу → получить оптимизированные файлы» — следующий эксперимент. Полуавтоматический patch к сайту потребует отдельных проверок соответствия файлов, srcset, layout и visual regression; текущий MCP не является готовым deploy-agent.

## Готовое задание для другого режима

> Репозиторий OlegStrateg/layerporter-site, база feat/LP-095-artifact-url-ingestion. Прочитай актуальный head, AGENTS и этот документ; сверяй каждый finding с текущим кодом, потому что работа продолжается. Закрой M1 и воспроизведи/исправь M2, M3. Сохрани resource_link/resources/read; не перестраивай продукт и не добавляй расширение/hosted endpoint. Выполни минимальный release smoke на чистом упакованном пакете и реальном MCP-клиенте. В отчёте дай commit, точные команды/результаты, MIME/hash/bytes/размеры реально открытого файла, список проверенных клиентов и остаточные ограничения. Непроверенное пометь явно. Публикация/merge/deploy — только в пределах разрешений владельца в этом чате. Остановись после закрытия релизных замечаний.

## Снимок исходников для воспроизводимости

- package.json: blob a22510b67665d5543cf5d452cde963b2704d3d7d
- README.md: blob 8fdd24aa5398f18dfad2509417f61324af950567
- src/server.js: blob e6adac7833c6bb40f6e91e3b57ff47141f84a428
- src/tools.js: blob 0aa0bfb425a056906826d84a10df249f44f821a6
- src/url-ingestion.js: blob c9192194d39cf9127a7e965cc8aaac4413d77dd3
- src/artifact-store.js: blob c9cfdbe62a36f96d23805a5f8f1b8c8eded7f3bc
- src/artifact-result.js: blob 587e3b7272f889242571fdd6839453f8081e6a95
- distribution/distribution-manifest.json: blob d46ffceeec03cd5d8a8a04ca62923fd4a10df7f5
