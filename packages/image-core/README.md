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
- **двухслойный input gate** для недоверенных bytes:
  1. ранняя проверка фактической сигнатуры допускает только JPEG / PNG / WebP и возвращает стабильный `INPUT_FORMAT_NOT_ALLOWED` для остальных данных;
  2. независимый native decoder allowlist на уровне libvips блокирует всё семейство `VipsForeignLoad` и открывает только JPEG / PNG / WebP Buffer loaders;
- `Content-Type`, имя файла и расширение не считаются security boundary;
- HEIF/AVIF input временно fail-closed заблокирован из-за bundled libheif 1.23.2 и актуальных security advisories; снятие блокировки допускается только после runtime минимум с `libheif >=1.23.4`, свежего advisory review и отдельного RETEST;
- TIFF/GIF/SVG и другие decoders также закрыты, пока формат явно не добавлен в product policy и security tests;
- выходные форматы: JPEG / PNG / WebP / AVIF; input gate не отключает AVIF encoder;
- AVIF output в период decoder hold нельзя подавать обратно в `inspectImage`/`optimizeImage`/compare path как input; это сознательная fail-closed граница до отдельного security решения;
- лимит декодируемых пикселей и максимальных размеров;
- никаких произвольных Sharp options наружу.

Ранняя signature-проверка — только defense-in-depth и UX/error-normalization. Основная native decoder boundary остаётся libvips allowlist; один magic-byte check не считается достаточной защитой.

## Публичные функции

### `inspectImage(buffer, options)`
Возвращает фактические metadata: bytes, format, mediaType, width, height, orientation, alpha, colour space и channels для разрешённых входных форматов.

Неразрешённый/unknown input отклоняется до native decode с `error.code = INPUT_FORMAT_NOT_ALLOWED`.

### `optimizeImage(buffer, options)`
Принимает целевые размеры и ограниченную policy, выполняет resize/encode, затем проверяет guards.

Если кандидат не проходит продуктовую защиту, возвращается `status: REJECT`. Неразрешённый input является input error и fail-closed отклоняется до декодирования.

## Форматная политика

`auto`:
- JPEG/PNG → WebP как baseline-кандидат;
- WebP → сохраняется текущий формат;
- alpha не переводится в JPEG;
- AVIF не выбирается автоматически; его можно запросить явно как output;
- HEIF/AVIF input остаётся заблокирован до отдельного security RETEST после обновления bundled libheif как минимум до 1.23.4 и freshness review текущих advisories.

Decoder decision не доверяет remote `Content-Type`: даже если AVIF bytes заявлены как `image/jpeg`, ранний byte gate и native allowlist должны их отклонить.

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

Тесты покрывают metadata, no-upscale, alpha guard, never-increase-bytes, invalid-format rejection, JPEG/PNG/WebP signature gate, native decoder allowlist, stable `INPUT_FORMAT_NOT_ALLOWED`, fail-closed HEIF/AVIF и TIFF input, spoofed Content-Type через MCP URL-path и сохранение AVIF output через независимый fresh-process decode.
