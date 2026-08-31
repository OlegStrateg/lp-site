# Chrome Web Store — Privacy checklist для Pinterest Downloader

Дата проверки: 31.08.2026

## Почему это обязательно

С 01.08.2026 Chrome Web Store усилил требования:
- любое собираемое расширением user data должно быть необходимо для заявленной единственной цели продукта;
- сбор данных должен быть прозрачно раскрыт;
- изменения практик обработки данных должны быть раскрыты пользователю;
- Privacy practices в Developer Dashboard должны совпадать с фактическим поведением продукта и Privacy Policy.

## Фактическое поведение после LP-023

### Не собираем для атрибуции
- историю браузера;
- полный referrer URL;
- Pinterest URL;
- содержимое Pins;
- скачанные изображения, видео или GIF;
- имена скачанных файлов;
- email, имя, телефон;
- рекламный идентификатор;
- отдельный visitor ID для landing attribution.

### First-party install/onboarding telemetry
Существующий /api/install:
- случайный installation-session ID;
- product/version;
- locale;
- country-level location, полученный Cloudflare из запроса;
- onboarding phases: open / pinned / panel_opened / abandoned;
- хранение install session: до 90 дней;
- aggregate event keys: до 180 дней.

### Landing attribution
Только после consent:
- source category;
- landing locale;
- CTA position;
- landing timestamp в first-party cookie;
- cookie max age 14 дней;
- после успешной атрибуции cookie удаляется;
- отдельный Chrome cookies permission НЕ используется.

### Optional Yandex Metrica
- не грузится без analytics consent;
- Global Privacy Control / Do Not Track блокирует optional attribution;
- Webvisor OFF;
- Clickmap OFF;
- trackLinks OFF.

## Что проверить вручную в Chrome Web Store Developer Dashboard

Перед следующей отправкой версии открыть **Privacy practices** Pinterest Downloader и сверить с текущим поведением.

1. Privacy Policy URL:
   https://layerporter.com/privacy/

2. Single purpose:
   должен описывать только скачивание доступных пользователю изображений / видео / GIF и связанные пользовательские функции.

3. Data use:
   не утверждать «данные не собираются», если остаётся /api/install.
   Проверить текущие чекбоксы как минимум на соответствие:
   - User activity — installation/onboarding events;
   - Location — country-level location, если текущая форма CWS относит это поле к Location;
   - Website content — отдельно сверить с фактическим доступом расширения к Pinterest media/page content, даже если контент не отправляется на сервер.

4. Limited Use:
   подтвердить только если фактическое поведение полностью соответствует требованиям.
   Privacy Policy уже содержит Limited Use statement.

5. Не заявлять:
   - продажу данных;
   - advertising / retargeting;
   - сбор browsing history для аналитики;
   - передачу скачанного контента в аналитику.

## Stop-критерий

Нельзя отправлять следующую версию на модерацию, если Privacy practices в CWS противоречат:
- manifest permissions;
- фактическим сетевым запросам;
- /api/install;
- Privacy Policy;
- поведению welcome page.

Этот файл — внутренний checklist. Он не заменяет юридическую консультацию по конкретной юрисдикции.
