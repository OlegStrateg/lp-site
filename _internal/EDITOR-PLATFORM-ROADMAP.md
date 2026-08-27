# LayerPorter Editor Platform — Pareto roadmap

Статус: зафиксированная рабочая дорожная карта.
Принцип: один спринт — один законченный и проверяемый пользовательский результат, а не фиксированная неделя. Простые функции закрываем короткими сессиями; сложные AI-функции проходят отдельные эксперименты и не блокируют MVP.

## Обязательный формат спринта

Каждый спринт содержит: **Result**, **Skills**, **References**, **Scope**, **Verification**. Референсы не копируются вслепую: проверяются лицензия, актуальность и применимость.

## North Star

Основная воронка: `SEO/расширение → импорт → первое изменение → переключение инструмента → экспорт`.
Главная метрика: доля пользователей, успешно скачавших изменённое изображение.

## NOW — базовая продуктовая линия

### Sprint 0 — выбор Editor Core

- **Result:** реальный JPG/PNG импортируется, отображается и экспортируется; выбран один движок.
- **Skills:** `architecture`, `architect-review`, `astro`, graphics frontend.
- **References:** Fabric.js как основной кандидат; Ascentspark React Image Editor для spike; Filerobot и miniPaint как доноры паттернов.
- **Scope:** сравнить mobile, большой файл, undo/redo, bundle и лицензии. Рекомендация — Fabric.js, если оболочка не ускоряет вертикальный сценарий минимум вдвое.
- **Verification:** реальный файл проходит import/export; решение фиксируется ADR.

### Sprint 1 — каркас редактора

- **Result:** `загрузить → увидеть → скачать` на компьютере и телефоне.
- **Skills:** `astro`, UX/UI, `analytics-tracking`, accessibility.
- **References:** Fabric.js, Filerobot upload flow, простота входа iLoveIMG, текущий LayerPorter UI.
- **Scope:** drag-and-drop, canvas, export, ошибки, базовые события.
- **Verification:** JPG/PNG/WebP и большой файл; screenshot, console/network audit.

### Sprint 2 — Crop

- **Result:** свободная обрезка, точные пиксели и пропорции.
- **Skills:** graphics frontend, UX/CRO, accessibility, QA.
- **References:** Filerobot crop, iLoveIMG Crop Image, Fabric.js clipping patterns.
- **Scope:** handles, numeric inputs, presets, apply/cancel.
- **Verification:** фактический размер экспорта совпадает с заданным; повторная загрузка не нужна.

### Sprint 3 — Resize и Convert

- **Result:** изменение ширины/высоты и экспорт JPG/PNG/WebP с качеством.
- **Skills:** imaging engineering, performance, export correctness, analytics.
- **References:** Picture Converter, iLoveIMG Resize/Convert, Canvas/OffscreenCanvas, текущие Worker-паттерны проекта.
- **Scope:** aspect lock, alpha, orientation, quality и размер результата.
- **Verification:** пиксели, прозрачность, ориентация и формат проверены реальными файлами.

### Sprint 4 — Text

- **Result:** текст добавляется, редактируется, перемещается и экспортируется.
- **Skills:** UX/UI, typography, Fabric objects, accessibility.
- **References:** Fabric.js Text/IText, Filerobot text tool, Canva object interaction.
- **Scope:** шрифт, размер, цвет, alignment, position; без сложной системы Canva.
- **Verification:** desktop/mobile, кириллица/латиница, экспорт без смещения.

### Sprint 5 — единая сессия и history

- **Result:** crop, resize и text переключаются без повторного импорта; undo/redo обратимы.
- **Skills:** `architecture`, state management, performance, recovery.
- **References:** Fabric.js serialization, miniPaint history, command pattern.
- **Scope:** единый document state и tool registry.
- **Verification:** несколько операций и полный undo/redo на одном документе.

### Sprint 6 — SEO-точки входа

- **Result:** `/crop-image/`, `/resize-image/`, `/convert-image/`, `/add-text-to-image/`, `/image-editor/` индексируемы и открывают нужный режим общего Editor Core.
- **Skills:** `ai-seo`, `astro`, technical SEO, GEO, content architecture.
- **References:** iLoveIMG information architecture, SERanking `seo-skills`, Astro static routing, Landstro/astro-haze.
- **Scope:** уникальные intent, title/H1, answer-first copy, FAQ, schema, canonical, sitemap, linking; без массовых doorway pages.
- **Verification:** HTTP, rendered metadata/schema, sitemap, direct URL и сохранение документа при switch.

### Sprint 7 — Analytics и CRO

- **Result:** видны источники, drop-offs, successful export и tool switch.
- **Skills:** `analytics-product`, `analytics-tracking`, `ab-test-setup`, CRO/UX.
- **References:** продуктовая воронка LayerPorter, текущие расширения, iLoveIMG и Canva UX.
- **Scope:** события без изображений и PII; A/B только после достаточного трафика.
- **Verification:** тестовая сессия целиком видна в аналитике без персональных данных.

### Sprint 8 — Picture Converter handoff

- **Result:** пользователь расширения открывает исходное/полученное изображение в общем редакторе.
- **Skills:** Chrome MV3, handoff architecture, privacy, analytics.
- **References:** текущий Picture Converter, Chrome Extensions docs, `EditJob v1`.
- **Scope:** простой надёжный handoff, source tag, download/upload fallback, короткий TTL при серверной передаче.
- **Verification:** реальный путь расширение → edit → export.

### Sprint 9 — Pinterest Downloader handoff

- **Result:** скачанное Pinterest-изображение сразу доступно для редактирования.
- **Skills:** Chrome MV3, secure file transfer, UX/CRO, analytics.
- **References:** текущий Pinterest Downloader, welcome flow, Chrome downloads API, Editor Core.
- **Verification:** реальный путь Pinterest → download → edit → export; источник виден.

### Sprint 10 — публичный MVP

- **Result:** проверенный продукт готов к продвижению.
- **Skills:** acceptance QA, accessibility, performance, privacy, SEO, CRO, delivery.
- **References:** Playwright, Lighthouse, Chrome DevTools, Core Web Vitals.
- **Scope:** desktop/mobile, большие файлы, ошибки, CI, rollback.
- **Verification:** build, smoke, HTTP, screenshots, clean console/network, production rollback.

## NEXT — Quality Enhancement

### Enhance Sprint 1 — browser Quality Resize без AI

- **Result:** быстрый локальный инструмент resize + sharpen + базовые denoise/contrast, без ложного обещания восстановления деталей.
- **Skills:** imaging engineering, browser processing, performance, export correctness, UX/CRO.
- **References:** Canvas/OffscreenCanvas, Bicubic/Lanczos, `pica`, Editor Core.
- **Scope:** качественное увеличение/уменьшение, резкость, лёгкое шумоподавление, JPG/PNG/WebP. Не называем обычную интерполяцию AI.
- **Verification:** фотографии, скриншоты, логотипы, текст и большие JPEG; сравнение размеров и артефактов.

### Enhance Sprint 2 — AI Upscaler benchmark

- **Result:** выбран лучший кандидат по качеству, скорости, стоимости и лицензии.
- **Skills:** `ai-product`, CV/ML evaluation, performance/cost analysis, model/license review.
- **References:** Real-ESRGAN, SwinIR, waifu2x, Upscayl.
- **Scope:** одинаковый фиксированный корпус: фото, лица, иллюстрации, текст, JPEG artifacts. Модели сравниваются на одних входах.
- **Verification:** сохранённые before/after, latency, memory/GPU, cost per successful export, license registry.

### Enhance Sprint 3 — AI Upscaler product

- **Result:** `/image-upscaler/` даёт ×2/×4 для режимов Photo и Illustration внутри Editor Core.
- **Skills:** AI inference, backend/GPU, queue/fallback, privacy, analytics, `ai-seo`.
- **References:** победитель benchmark; Upscayl UX; общий AI job contract.
- **Scope:** before/after, progress, timeout/retry, limits, cost tracking; обычный редактор работает при сбое AI.
- **Verification:** фиксированный корпус, mobile UX, failure fallback, стоимость и successful export.

### Enhance Later — Face Restoration

- **Result:** отдельный явно обозначенный эксперимент, а не автоматическая часть upscale.
- **Skills:** face restoration evaluation, AI UX/trust, privacy, license review.
- **References:** GFPGAN и CodeFormer после проверки актуальных лицензий моделей/весов.
- **Scope:** предупреждение, что AI может изменить черты; before/after и opt-in.
- **Verification:** identity drift оценивается отдельно; без принятого порога функция не публикуется.

## LATER — сложная AI-линия

### Background Removal

- **Result:** прозрачный PNG и ручные restore/erase brushes.
- **Skills:** `ai-product`, CV evaluation, mask UX, backend/GPU, privacy, license review.
- **References:** withoutBG, rembg baseline, коммерческие API для benchmark.
- **Verification:** фиксированный корпус волос, меха, стекла, товаров, людей и иллюстраций; quality/latency/cost/fallback gate.

### Object Removal

- **Result:** обратимое удаление отмеченного объекта.
- **Skills:** inpainting, mask history, QA, cost control.
- **References:** LaMa и IOPaint.
- **Verification:** фиксированный корпус, исходник не уничтожается, undo работает.

### Outpaint / Extend

- **Result:** расширение холста с очередью, вариантами и безопасным возвратом в документ.
- **Skills:** generative imaging, `ai-product`, platform/queues, moderation, cost/privacy/license review.
- **References:** Diffusers, IOPaint workflow, только разрешённые коммерческие модели.
- **Verification:** спрос, quality, latency, cost cap, moderation, timeout/retry и TTL подтверждены до релиза.

## Фильтр Pareto

Функция идёт в NOW, только если минимум три ответа «да»: увеличивает successful export; имеет поисковый/пользовательский спрос; использует Editor Core; закрывается короткой итерацией; сразу даёт данные, деньги или канал привлечения. Иначе — Later без преждевременной детализации.

## Не блокирует MVP

Аккаунты, collaboration, PSD, видео, marketplace шаблонов, глубокие Canva/Figma-интеграции, сложные слои, face restoration и генеративная ретушь. Canva/Figma сначала получают простой import/export в Editor Core; глубокая интеграция — только по измеримому потоку.