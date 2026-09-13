# LP-098 — Virtual Try-On

Дата старта: 2026-09-13

Статус: **CANDIDATE — код Sprint 1 собран, VERIFIED не присвоен**

Рабочая ветка: `feat/LP-098-virtual-try-on-tool`

Точка восстановления: `recovery/pre-LP-098-virtual-try-on-2026-09-13`

База: `master@e982caffb8a53e0dfde135d0d7610cd9fd459a89`

Draft PR: `#242`

## 1. Продуктовая граница

Virtual Try-On — отдельный инструмент LayerPorter на `/tools/virtual-try-on/`.

`/convert/` не меняется. Production не меняется до VERIFIED.

Первый MVP — только верхняя одежда: футболки, рубашки, свитеры, куртки и аналогичные вещи. Это визуальная примерка, а не определение реального размера или физики ткани.

Архитектура строится так, чтобы затем использовать то же ядро в Chrome-расширении.

## 2. Архитектура

### Instant Preview

- локальная обработка в браузере;
- без LayerPorter upload endpoint;
- без платного inference API на каждую примерку;
- MediaPipe Tasks Vision `1.0.1`;
- Pose Landmarker Lite `float16/1`;
- GPU с CPU fallback;
- pose кэшируется для выбранного фото;
- fit controls не запускают ML повторно;
- arm-overlay кэшируется;
- результат экспортируется в PNG.

### HD Try-On

Отдельный будущий слой. Не включать до проверки качества, экономики и коммерческой чистоты всего модельного/preprocessing стека.

## 3. Open Source First

Инженерный референс: `pravoobi/try-on` / `@practics/tryon-core`, MIT.

Ценные элементы референса:

- on-device pipeline;
- pose estimation;
- segmentation;
- garment warp;
- compositing;
- WebGPU/LiteRT;
- framework-free core.

Первый кандидат не копирует demo-приложение и не тащит весь стек раньше необходимости.

## 4. Выполнено

### Спринт 0 — изоляция и безопасность

- [x] Найден канонический репозиторий `OlegStrateg/layerporter-site`.
- [x] Зафиксирован фактический `master` HEAD.
- [x] Создана recovery branch.
- [x] Создана отдельная feature branch.
- [x] Создан draft PR #242.
- [x] `/convert/` не затронут.
- [x] Кандидат оставлен вне sitemap.
- [x] Кандидат закрыт `noindex` в HTML и headers.
- [x] CSP расширен только для `/tools/virtual-try-on/*`.
- [x] API keys/secrets отсутствуют.

### Спринт 1 — Instant Preview

- [x] Страница инструмента на Astro/BaseLayout.
- [x] Загрузка фото человека.
- [x] Загрузка изображения вещи PNG/JPG/WebP до 20 MB.
- [x] Локальное определение позы.
- [x] Проверка видимости плеч и таза.
- [x] Автоматическая очистка простого edge-connected фона вещи.
- [x] Размещение вещи по плечам и тазу.
- [x] Базовая окклюзия: руки возвращаются поверх вещи.
- [x] Ручная коррекция масштаба/X/Y.
- [x] PNG export.
- [x] Ошибки не затираются статусом `Ready`.
- [x] Privacy/runtime disclosure показывается до запуска.
- [ ] Живой Chrome test на минимум трёх парах `человек + вещь`.

## 5. Аудит геометрии 2026-09-13

Во втором инженерном проходе найден критичный дефект исходного подхода: MediaPipe использует анатомические `left/right`, а на зеркальных/селфи-изображениях экранный порядок точек может быть противоположным. Прежний расчёт угла мог развернуть garment overlay неверно.

Исправлено:

- [x] Геометрия теперь нормализует плечи и таз по экранной X-координате.
- [x] Убран простой прямоугольный rotate/scale overlay.
- [x] Добавлена деформация вещи по четырём точкам торса.
- [x] Квадрилатераль делится на четыре треугольника с affine mapping.
- [x] Геометрия вынесена в `public/tools/virtual-try-on/geometry.js`.
- [x] Браузерный `app.js` использует именно этот общий модуль.
- [x] Дублированная математика в `app.js` запрещена verifier-ом.
- [x] Добавлен `scripts/test-virtual-try-on-geometry.mjs`.
- [x] Локальный детерминированный тест реально выполнен и прошёл: mirrored semantic labels дают одинаковую сетку; affine mapping точно попадает в anchor points.

Важно: этот тест подтверждает геометрию, но не заменяет живой визуальный тест MediaPipe + Canvas в Chrome.

## 6. Производительность

- [x] Pose кэшируется на фото пользователя.
- [x] ML не запускается при движении fit controls.
- [x] Arm overlay кэшируется.
- [x] Preview ограничен `1280px` по длинной стороне.
- [x] Garment preprocess ограничен `900px`.
- [x] Cold runtime и pose timing показываются отдельно.
- [x] GPU -> CPU fallback.
- [ ] Замерить фактическую render latency в Chrome.
- [ ] Сравнить текущий torso warp с TPS из `@practics/tryon-core` на golden set.
- [ ] Переходить на TPS только при доказанном приросте качества.
- [ ] После стабилизации решить вопрос self-host runtime/model.

## 7. Проверки

### A. Функциональная

`person + garment -> pose -> torso geometry -> warp -> arm occlusion -> fit controls -> PNG`.

Статус: код реализован; живой browser gate ещё не закрыт.

### B. Приватность/экономика

Статический verifier запрещает `FormData`, XHR, `sendBeacon`, LayerPorter `/api` fetch, `apiKey` и `Authorization` в runtime инструмента.

Статус: статически защищено; требуется живой Network audit.

### C. Регрессия сайта

В общий `npm run build` включены:

1. существующие smoke/site checks;
2. `scripts/test-virtual-try-on-geometry.mjs`;
3. Astro build и существующие site gates;
4. `scripts/verify-virtual-try-on-tool.mjs`.

Статус GitHub Actions: **инфраструктурный блокер**. Jobs для LP-098 и независимого LP-097 создаются, но runner не назначается: `steps=[]`, `runner_id=0`, логов нет. Дополнительно проверен `macos-latest` — тот же результат до первого шага. Workflow после диагностики возвращён на `ubuntu-latest`.

Следствие: нельзя утверждать ни `build PASS`, ни `build FAIL из-за LP-098`. Production merge запрещён до реального выполнения build.

## 8. Следующие спринты

### Спринт 2 — живой quality gate

- [ ] Получить работающий preview/deploy.
- [ ] Desktop Chrome: 3+ пары person+garment.
- [ ] Отдельно проверить зеркальное селфи.
- [ ] Проверить PNG export.
- [ ] Проверить повторную вещь без reload.
- [ ] Проверить повторное фото без reload.
- [ ] Проверить fit controls и отсутствие повторного pose inference.
- [ ] Network audit пользовательских изображений.
- [ ] Проверить runtime failure/offline behavior.
- [ ] Проверить mobile layout.

### Спринт 3 — качество

- [ ] Golden dataset tops.
- [ ] TPS A/B test.
- [ ] Segmentation/matting A/B test.
- [ ] Решение о следующем уровне качества только по результатам сравнений.

### Спринт 4 — Chrome Extension

- [ ] Общий try-on core contract.
- [ ] Product image extractor из карточки товара.
- [ ] Выбор корректного изображения галереи.
- [ ] Side Panel / `Try on` action.
- [ ] Локальный профиль фото.
- [ ] Никаких secrets/API keys в extension.

### Спринт 5 — HD Try-On

- [ ] Benchmark dataset.
- [ ] Проверка коммерческой лицензии всех компонентов.
- [ ] Сравнение коммерческих и open-source моделей.
- [ ] HD только как явный второй уровень, не на каждый свайп.

### Спринт 6 — продуктовый слой

- [ ] Saved looks.
- [ ] Несколько фото/ракурсов.
- [ ] Предварительно рассчитанная swipe-лента.
- [ ] Метрики `upload -> run -> result -> repeat -> download -> HD -> outbound`.
- [ ] B2B widget/API только после доказанного спроса.

## 9. Production gate

До merge должны быть одновременно выполнены:

- [x] Изоляция LP-098.
- [x] `/convert/` не изменён.
- [x] Noindex до VERIFIED.
- [x] Runtime/model pinned.
- [x] Privacy disclosure.
- [x] Geometry regression test создан и локально проходит.
- [x] Shared geometry используется реальным browser app.
- [x] Static verifier добавлен.
- [ ] Полный `npm run build` реально прошёл.
- [ ] Desktop Chrome test прошёл.
- [ ] Mobile layout test прошёл.
- [ ] Минимум 3 визуальных пары приняты.
- [ ] Mirror/selfie case принят.
- [ ] PNG download принят.
- [ ] Network audit принят.
- [ ] Runtime error path принят.

## 10. VERIFIED

VERIFIED присваивается только после живого браузерного прогона и реального build gate. До этого состояние остаётся `CANDIDATE` независимо от количества статических проверок.
