# LP-094 — Live smoke: layerporter.com

Дата: 2026-09-10
Страница: https://layerporter.com/
Workflow run: 34483753928
Статус: SUCCESS

## Что проверено

Отдельный live harness на GitHub Actions скачал актуальную продакшн-главную `https://layerporter.com/`, извлёк опубликованные WebP-изображения и прогнал реальные байты через текущие `TOOL_HANDLERS` Website Image Optimizer MCP / shared image-core.

Важно: удалённый URL загружал тестовый harness. Текущий публичный MCP tool сам URL пока не принимает.

## Продакшн-страница

- HTTP: 200
- title: `LayerPorter — Chrome Extensions & Browser Tools`
- `<img>`: 15
- вхождений `/images/home/*.webp`: 11
- из них с `srcset`: 11/11
- с `sizes`: 11/11
- с `width` + `height`: 11/11
- без `width/height`: 4 вхождения иконок расширений:
  - `/pinterest-downloader/icon-128.png` — 2 раза
  - `/picture-converter/welcome/picture-converter-icon.png` — 2 раза

## Реальная оптимизация опубликованных файлов

| Файл | Оригинал | Повторное сжатие без resize | Resize до 50% ширины | Результат compare |
|---|---:|---:|---:|---|
| fashion-reference-960.webp | 68,926 B | 62,342 B, -9.55% | 22,934 B, -66.73%, 480×664 | ACCEPT |
| travel-reference-640.webp | 23,478 B | 21,160 B, -9.87% | 7,330 B, -68.78%, 320×213 | ACCEPT |
| workspace-reference-640.webp | 4,070 B | 3,456 B, -15.09% | 1,326 B, -67.42%, 320×214 | ACCEPT |
| fashion-board-reference-960.webp | 34,178 B | 31,960 B, -6.49% | 13,374 B, -60.87%, 480×320 | ACCEPT |

Средняя дополнительная экономия без изменения размеров на этих 4 уже WebP-файлах: около 10.25%.
Средняя экономия при уменьшении ширины вдвое: около 65.95%.

## Responsive variants

На реальном `fashion-reference-960.webp` генерация вариантов прошла:

- 320 px → 12,640 B → -81.66% → ACCEPT
- 480 px → 22,934 B → -66.73% → ACCEPT

## Product truth

Подтверждено:

- реальные опубликованные изображения скачиваются тестовым harness;
- текущий image-core реально декодирует и перекодирует их;
- `optimize_image` реально создаёт меньший бинарный candidate;
- `compare_image_versions` принимает candidate после no-regression проверок;
- `generate_responsive_variants` реально создаёт несколько размеров;
- live smoke завершился SUCCESS.

Не подтверждено / пока отсутствует:

- MCP сам не принимает URL страницы и не делает remote fetch;
- current text MCP response не возвращает пользователю бинарный оптимизированный файл: binary существует внутри core, но sanitizer оставляет только metadata/byteLength;
- тест не измеряет реальный rendered size/LCP в браузере, поэтому не является полной заменой Chrome/Page Audit runtime.

## Вывод

**ENGINE LIVE TEST = PASS.**

Ядро и MCP handlers реально работают на продакшн-изображениях LayerPorter. До публичного релиза необходимо закрыть delivery gap: безопасно передавать/сохранять оптимизированный artifact вне model context. URL ingestion следует решать отдельно и не смешивать с бинарным model context.
