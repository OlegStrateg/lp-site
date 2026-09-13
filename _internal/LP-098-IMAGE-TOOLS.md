# LP-098 — Resize Image + Crop Image

Статус: implementation candidate.

## Решение

Два самостоятельных SEO-входа на общем лёгком browser image core:

- `/tools/resize-image/` — изменение полного изображения до заданных Width × Height в пикселях;
- `/tools/crop-image/` — обрезка по визуальной рамке, точным Width / Height / X / Y и preset-пропорциям.

URL под `/tools/` соответствует принятому ADR-001 для SEO-инструментов и существующему паттерну LayerPorter.

## Архитектура

- JPG / PNG / WebP;
- `createImageBitmap` для декодирования;
- Canvas / OffscreenCanvas для рендера;
- без Fabric/Cropper/Pica в MVP;
- без отправки пользовательского изображения на сервер;
- общее ядро `src/scripts/imageToolCore.ts`;
- отдельные UI-контроллеры Resize и Crop;
- аналитика через существующий first-party `track` без имён файлов и содержимого.

## Проверки

1. Статическая: canonical, H1, controls, sitemap, cross-links, отсутствие remote runtime.
2. Браузерная: реальные JPEG → точные размеры результата → download → повторный файл без reload.
3. Mobile: 390×844 без горизонтального overflow.

## Источники

- ADR-001 — отдельный SEO-intent → отдельная SEO-страница + общее ядро.
- EDITOR-PLATFORM-ROADMAP — Crop, Resize и отдельные SEO entry points.
- iLoveIMG Resize/Crop — подтверждение раздельного пользовательского intent.
- MDN `createImageBitmap` / Canvas — нативная браузерная база.

## Ограничения MVP

- GIF/SVG не заявляются;
- обычный resize не называется AI upscale;
- output ограничен безопасными browser canvas лимитами;
- production deploy только после build/browser проверки.
