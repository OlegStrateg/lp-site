# Home i18n / SEO routing policy

Дата: 2026-09-01

## Видимый переключатель

Показывать полное название языка и короткий код:
- English (EN)
- Русский (RU)
- Deutsch (DE)
- Español (ES)
- Français (FR)
- Português (PT)
- 日本語 (JA)
- 简体中文 (ZH)

Список расширяется только после публикации реально локализованной Home-страницы.

## Региональные дубли

Не удалять региональные URL, если под них есть поисковая или языковая причина:
- es-ES / es-419;
- pt-BR / pt-PT;
- zh-CN / zh-TW.

Но в human menu не показывать их как несколько одинаковых строк.

Предпочтительная логика после появления локалей:
- Español ведёт на /es/ по умолчанию; браузерные es-419 локали получают предложение открыть /es-419/;
- Português ведёт на /pt-br/ по умолчанию; pt-PT получает предложение открыть /pt-pt/;
- 中文 ведёт на /zh-cn/ по умолчанию; zh-TW / zh-HK / zh-MO получают предложение открыть /zh-tw/.

Без принудительного редиректа на первом визите. Явный выбор пользователя можно запоминать.

## SEO

- каждая опубликованная локаль имеет self-canonical;
- reciprocal hreflang только между реально существующими локалями;
- x-default → English root;
- не создавать locale URL с English-copy placeholder;
- региональные версии должны использовать локальную семантику, а не механическую замену пары слов;
- скрытие региональной версии из dropdown не означает noindex и не удаляет её из hreflang/sitemap.


## Опубликованные Home-локали

После LP-037:
- English (EN) → /
- Русский (RU) → /ru/
- Deutsch (DE) → /de/
- Español (ES) → /es/
- Français (FR) → /fr/
- Português (PT) → /pt-br/
- 日本語 (JA) → /ja/
- 简体中文 (ZH) → /zh-cn/

Для опубликованных Home-страниц:
- self-canonical;
- reciprocal hreflang между всеми реально опубликованными Home-локалями;
- x-default → /;
- все опубликованные Home-страницы находятся в sitemap;
- языковое меню показывает полное название + код;
- без автоматического редиректа по языку браузера.

RU Home использует широкий root «расширения для браузера». Формулировки Chrome и Яндекс Браузера используются как уточняющие secondary-кластеры, чтобы не ограничивать российскую версию только Chrome.


DE Home использует root «Browser-Erweiterungen», secondary «Chrome-Erweiterungen» и «Online-Tools». Конкретные converter-intents остаются на дочерних страницах.


ES Home использует root «extensiones de navegador», secondary «extensiones de Chrome» и «herramientas online». Основной пункт Español (ES) ведёт на /es/. Региональный Home /es-419/ в LP-036 не создаётся.


## LP-037 — семантика новых Home-локалей

FR:
- root: «extensions de navigateur»;
- secondary: «extensions Chrome», «outils en ligne».

PT-BR:
- root: «extensões de navegador»;
- secondary: «extensões para Chrome», «ferramentas online»;
- основной human-menu URL: /pt-br/;
- /pt-pt/ Home в этой задаче не создаётся.

JA:
- root: «ブラウザ拡張機能»;
- secondary: «Chrome 拡張機能», «オンラインツール».

ZH-CN:
- root: «浏览器扩展程序»;
- secondary: «Chrome 扩展程序», «在线工具»;
- основной human-menu URL: /zh-cn/;
- /zh-tw/ Home в этой задаче не создаётся.

Общее правило:
- exact-intent конвертеров и Pinterest остаётся на дочерних страницах;
- Home покрывает широкую категорию продуктов LayerPorter, а не отдельную операцию.
