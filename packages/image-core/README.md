# @layerporter/image-core

Общий серверный image-core для LayerPorter Website Image Optimizer.

## Назначение

Этот пакет отвечает только за детерминированную обработку изображения и защитные проверки. Он не содержит MCP transport, page audit, сетевой загрузчик, UI или запись в production.

## Основа

- Sharp 0.35.4 / libvips;
- Node.js >= 22.12;
- вход первого этапа — только `Buffer`;
- выход — структурированный результат `ACCEPT | REJECT` и выбранный buffer.

## Гарантии первой версии

- resize с `withoutEnlargement` по умолчанию;
- автоориентация по EXIF перед кодированием;
- сохранение ICC-профиля;
- запрет принудительного JPEG для alpha-изображения при `preserveAlpha=true`;
- `neverIncreaseBytes`: кандидат, который не уменьшил размер, не принимается;
- ограниченный allowlist форматов: JPEG / PNG / WebP / AVIF;
- лимит декодируемых пикселей и максимальных размеров;
- никаких произвольных Sharp options наружу.

## Публичные функции

### `inspectImage(buffer, options)`
Возвращает фактические metadata: bytes, format, mediaType, width, height, orientation, alpha, colour space и channels.

### `optimizeImage(buffer, options)`
Принимает целевые размеры и ограниченную policy, выполняет resize/encode, затем проверяет guards.

Если кандидат не проходит защиту, возвращается `status: REJECT`, а поле `buffer` содержит исходное изображение.

## Форматная политика

`auto`:
- JPEG/PNG → WebP как baseline-кандидат;
- WebP/AVIF → сохраняется текущий формат;
- alpha не переводится в JPEG;
- AVIF не выбирается автоматически в этой версии — его включение требует benchmark шага 15.

## Что намеренно отсутствует

- URL fetch / SSRF boundary;
- batch queue;
- responsive variants;
- page context;
- MCP tools;
- filesystem writer;
- hosted transport.

Они добавляются отдельными шагами только после прохождения соответствующих gate.

## Проверка

```bash
cd packages/image-core
npm install
npm test
```

Тесты покрывают metadata, no-upscale, alpha guard, never-increase-bytes и invalid-format rejection.
