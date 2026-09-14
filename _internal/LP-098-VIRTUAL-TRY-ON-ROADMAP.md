# LP-098 — Virtual Try-On

Дата старта: 2026-09-13
Последнее решение: 2026-09-14

Статус: **READY-CORE CANDIDATE — самописный прототип отклонён, VERIFIED не присвоен**

Рабочая ветка: `feat/LP-098-virtual-try-on-tool`

Точки восстановления:
- `recovery/pre-LP-098-virtual-try-on-2026-09-13` — до начала LP-098;
- `recovery/LP-098-custom-prototype-rejected-2026-09-14` — архив отклонённого самописного прототипа.

База проекта: `master@e982caffb8a53e0dfde135d0d7610cd9fd459a89`
Draft PR: `#242`

## 1. Решение 2026-09-14

Первая самописная реализация LP-098 признана неверным инженерным shortcut и **не развивается дальше**.

Причина: при загрузке фотографии, на которой одежда находится на человеке/людях, прототип не выделял предмет одежды. Он мог деформировать всю исходную фотографию и использовать её как текстуру garment overlay. Это нарушает саму продуктовую задачу virtual try-on.

Действия:
- [x] Проблема подтверждена живым тестом пользователя.
- [x] Самописный `public/tools/virtual-try-on/app.js` удалён из рабочей ветки.
- [x] Самописный `geometry.js` удалён.
- [x] Geometry test отклонённого движка удалён из build pipeline.
- [x] Сохранена отдельная recovery branch для истории/разбора.
- [x] Рабочий кандидат переведён на готовый `pravoobi/try-on` / `@practics/tryon-core`.

## 2. Новый принцип

Не изобретать virtual try-on заново.

Используем готовый browser-native pipeline:

`person photo -> person segmentation + pose -> garment extraction/matting -> garment anchors -> TPS warp -> mask/occlusion compositor -> result`

Основной upstream:
- repository: `pravoobi/try-on`;
- package: `@practics/tryon-core@0.2.0`;
- core license: MIT;
- upstream live reference: `https://pravoobi.github.io/try-on/`.

Публичный пакет уже содержит:
- `createInferenceWorker()`;
- `createMattingWorker()`;
- person segmentation;
- MoveNet pose estimation;
- `extractGarmentAlpha()`;
- `cropToAlphaBBox()`;
- `suggestAnchors()`;
- body anchor mapping;
- thin-plate-spline garment warp;
- person-mask / arm occlusion compositing;
- optional depth/relighting path.

## 3. Что проверено в upstream живьём

- [x] Приложение открывается и работает как самостоятельный browser-native app.
- [x] Есть `Your Photo`.
- [x] Есть `Live webcam`.
- [x] Есть `upload your own garment`.
- [x] Есть готовый garment catalog.
- [x] Есть mask/skeleton/color matching controls.
- [x] Есть advanced `Enhance (3D)` path.
- [x] Garment upload поддерживает flat-lay/hanger image.
- [x] Garment upload поддерживает фото человека в одежде: background matting + clothes parsing выделяют сам garment.
- [x] Если target garment не найден, upstream extraction path возвращает ошибку вместо использования всего изображения как garment.

## 4. Текущий кандидат LayerPorter

Маршрут: `/tools/virtual-try-on/`.

Текущий этап намеренно использует upstream deployment внутри изолированного noindex candidate, чтобы сначала проверить механику готового решения и не смешивать её с задачей self-hosting.

- [x] Старый LayerPorter runtime больше не используется страницей.
- [x] Ready-core candidate встроен.
- [x] Временная публичная тестовая страница создана.
- [x] Старый тестовый URL заменён на ready-core candidate, чтобы пользователь не мог случайно снова открыть отклонённый движок.
- [x] Browser automation подтвердил: LayerPorter top bar + upstream app + catalog/photo mode загружаются.
- [x] `noindex` остаётся обязательным.
- [x] Production merge запрещён.

Важно: iframe/upstream deployment — **только промежуточный quality gate**, не финальная production-архитектура.

## 5. Следующий спринт — self-host ready core

Цель: тот же pipeline должен работать из LayerPorter без внешнего iframe и без зависимости от чужого live deployment.

Порядок:

1. [ ] Подключить `@practics/tryon-core@0.2.0` в LayerPorter build.
2. [ ] Закрепить package lock и transitive dependencies.
3. [ ] Self-host LiteRT WASM и segmentation/pose models.
4. [ ] Подключить `createInferenceWorker()`.
5. [ ] Подключить `createMattingWorker()` лениво только при upload garment.
6. [ ] Использовать upstream `extractGarmentAlpha`/`cropToAlphaBBox`/`suggestAnchors`.
7. [ ] Использовать upstream TPS/compositor вместо собственной геометрии.
8. [ ] Сделать минимальный LayerPorter UI поверх core.
9. [ ] Убрать iframe после прохождения self-hosted gate.

## 6. Multi-person garment input

Upstream clothes parsing умеет отделять garment от wearer, но multi-person input является отдельным риском: одна semantic label mask может содержать одежду нескольких людей.

Правило LayerPorter:
- если найден один явный garment component — использовать его;
- если найдено несколько кандидатов — пользователь выбирает нужный garment кликом/карточкой;
- никогда не объединять несколько людей/предметов в один garment asset молча;
- если уверенности нет — показать ошибку/selection UI, а не генерировать мусор.

Реализовать этот слой **после** self-host готового upstream extraction, не вместо него.

## 7. Лицензионный gate

MIT-лицензия repository/core **не является автоматическим подтверждением** коммерческой чистоты всех моделей и датасетов.

Перед production self-host обязательна отдельная проверка:
- `@practics/tryon-core`;
- LiteRT.js;
- Selfie Segmenter weights;
- MoveNet weights;
- `Xenova/modnet`;
- `Xenova/segformer_b2_clothes`;
- исходных моделей, датасетов и converted weights;
- всех transitive ML dependencies.

Пока этот gate не закрыт, статус только `CANDIDATE`.

## 8. Три обязательные проверки результата

### Проверка A — extraction
Минимум:
- transparent garment PNG;
- flat-lay garment photo;
- one-person worn garment photo;
- multi-person photo.

Критерий: в pipeline передаётся garment, а не исходная фотография целиком.

### Проверка B — try-on quality
Минимум 5 person photos × 3 garments.
Проверить shoulders/waist/hem, arm occlusion, mirror/selfie pose, разные body proportions.

### Проверка C — runtime/privacy
Проверить WebGPU + CPU/WASM fallback, повторную примерку, network log и отсутствие upload пользовательских изображений на LayerPorter backend.

## 9. Chrome Extension

Только после self-hosted website core:
- общий core contract;
- product-image extraction со страницы магазина;
- `Try on` action / Side Panel;
- локальное сохранение user photo;
- тот же extraction/TPS/compositor pipeline;
- никаких API keys в extension.

Сайт и расширение не должны иметь два разных try-on engines.

## 10. HD слой

Отдельный будущий уровень. Browser preview не заменяется server HD model.

`instant ready-core preview -> explicit HD action -> photorealistic VTON`

HD не запускается на каждый просмотр/свайп.

## 11. Production gate

До merge одновременно должны пройти:
- [x] LP-098 изолирован от `/convert/`.
- [x] Rejected custom engine сохранён только в recovery history.
- [x] Candidate закрыт `noindex`.
- [x] Ready upstream mechanics проверены в браузере.
- [ ] Self-hosted `@practics/tryon-core` работает внутри LayerPorter.
- [ ] Full build реально проходит.
- [ ] License audit закрыт.
- [ ] Desktop Chrome quality set проходит.
- [ ] Mobile layout проходит.
- [ ] Multi-person ambiguity не выдаёт мусорный result.
- [ ] Network/privacy audit проходит.
- [ ] Error/offline paths проходят.

## 12. VERIFIED

VERIFIED присваивается только self-hosted LayerPorter build после живого браузерного прогона и полного production gate. Внешний iframe/upstream candidate никогда не считается VERIFIED production-версией.
