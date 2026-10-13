# LP-123 — ИИ-редактирование на странице Resize Image
Дата: 13 октября 2026. Статус: CANDIDATE, НЕ ВКЛЮЧЕНО И НЕ ПРОВЕРЕНО НА PRODUCTION.
Git baseline: 95d9351cf3ebc2c441abb41b00ff707c645e9c5d (`OlegStrateg/lp-site`, ветка `master`).
Решение: отдельная опциональная панель ИИ ниже текущего Resize; оба языка EN/RU; существующий браузерный resize не меняется по логике. API — Cloudflare Pages Function.

## Куда вставить ключ и что нужно включить
Cloudflare → Workers & Pages → layerporter → Settings → Variables and Secrets → Add → Encrypt.
Секреты: `AI_IMAGE_API_KEY` (API-провайдер), `AI_IMAGE_EDIT_URL` (полный HTTPS адрес OpenAI-совместимого multipart edits endpoint), `AI_IMAGE_MODEL` (точный model ID), `AI_IMAGE_OWNER_PASSWORD` (уникальный пароль >=24 символов), `AI_IMAGE_QUOTA_SALT` (случайная строка >=24 символов), `AI_IMAGE_TURNSTILE_SECRET` (Turnstile secret).
Переменная, не секрет: `AI_IMAGE_TURNSTILE_SITE_KEY` (public site key).
Отдельно Cloudflare D1 → создать БД `layerporter-ai-limits`; выполнить `scripts/sql/ai-image-quotas.sql`; добавить D1 binding `AI_IMAGE_DB` к Cloudflare Pages project для production и preview.
Без всех перечисленных значений сервер отвечает 503 и платные вызовы невозможны. Значения не коммитить в Git.
Важное: сам API-провайдер пока НЕ УСТАНОВЛЕН. Нужно проверить, что он принимает стандартные multipart поля image,prompt,model,n,output_format и возвращает data[0].b64_json. До публикации обновить Privacy Policy, указав точное юрлицо провайдера и его политику хранения данных. Установить денежный бюджет у провайдера.

## Лимиты и безопасность
Для публики 1 запрос на IP-адрес в день, суммарно 20 платных запросов на UTC день по всему сайту; строгое резервирование места до вызова провайдера одним атомарным оператором SQL в D1. Неиспользование KV исключает гонки из-за eventually consistent хранения.
Владелец: отдельный ввод длинного пароля → cookie HttpOnly Secure 24 часа, обход квот только на сервере. Публичные запросы требуют server-side Turnstile. На изображение не более 6 МиБ; JPEG/PNG/WebP + проверка сигнатуры; текст до 800 символов.
Не сохранять изображения и запросы в аналитике. При неизвестном статусе биллинга после таймаута зарезервированная квота остаётся потраченной — защита расходов важнее повтора.

## Три проверки
1. Безопасность: прямые POST без Origin или Turnstile, неверный пароль, поддельный cookie, отсутствие D1 или ключа, параллельные запросы и пределы бюджета.
2. Функционал: загрузить JPG/PNG/WebP; resize прежний; обработка по запросу; до/после; скачать; повторно редактировать; переключение языков и 390px.
3. Production: GitHub CI, отдельная preview-сборка, реальная генерация с ключом, мониторинг расходов, корректность disclosure, smoke после production.
Всё ещё требуется настройка Cloudflare и фактическое тестирование с API, до них НЕ публиковать.
