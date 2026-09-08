# Sprint A0 — аудит Home EN + 7 локалей

Дата: 2026-09-08
Родительский issue: #154
Master tracker: #153
Production baseline: `36315b38d618f12973ce38e33955835ead60bf7d`
Scope: `/`, `/ru/`, `/de/`, `/es/`, `/fr/`, `/pt-br/`, `/ja/`, `/zh-cn/`.

## Метод проверки

До рекомендаций использованы три независимых контура:

1. **Фактическое состояние:** production master, исходники Home, CSS, locale routing, текущая аналитика, GSC.
2. **Поисковый спрос/интент:** GSC page/query data + внешний SERP-чек зафиксированных broad-root запросов.
3. **Качество:** SEO continuity, редакторская естественность, CRO-воронка, AI-readiness и соответствие реальным продуктам.

Присланный CRO-аудит используется как гипотезы, а не как готовое ТЗ.

---

## 1. Итоговая оценка Home как класса страниц

**Статус: IMPROVE, не REBUILD.**

Home EN+7 уже имеет рабочий фундамент:
- 8 реально локализованных URL;
- отдельные title/description;
- self-canonical;
- reciprocal hreflang;
- x-default на EN;
- broad SEO-root каждой локали сохранён в title/meta/visible copy согласно `_internal/HOME-I18N-SEO.md`;
- видимые продуктовые сущности Pinterest Downloader / Picture Converter;
- продуктовые карточки ведут на локализованные product landing;
- primary/secondary CTA визуально различаются.

Пересобирать Home с нуля не нужно. Сначала исправляются измерение воронки и routing, затем — copy/CRO.

---

## 2. P0 — аналитика Home недосчитывает основную воронку

Текущий код во всех Home использует `path_card_click`, но классификация href неполная.

### EN
Считаются:
- `/extensions/`;
- `/pinterest-downloader/`.

Не считается:
- `/picture-converter/`.

### Locales
Условие `href.startsWith('/extensions')` не ловит `/{locale}/extensions/`.

Фактически:
- `/{locale}/extensions/` — не считается;
- `/{locale}/pinterest-downloader/` — считается через `includes('/pinterest-downloader')`;
- `/{locale}/picture-converter/` — не считается.

### Вывод
До исправления нельзя честно оценивать Home → extension funnel и делать выводы из будущих CTA/H1 тестов.

Задача: #159 / LP-066.

**Приоритет: P0, выполнять первым.**

---

## 3. P0 architecture / BLOCKED — locale Home ведёт Web Tools в EN

На `/ru/`, `/de/`, `/es/`, `/fr/`, `/pt-br/`, `/ja/`, `/zh-cn/`:
- header Web Tools;
- hero secondary CTA;
- final CTA;
- footer Web Tools

ведут на `/convert/`.

При этом `src/pages/[locale]/convert/index.astro` реально генерирует локализованные Convert Hub.

### Но переключать routing немедленно нельзя
Current master Convert Hub ещё не прошёл финальный editorial/SEO/CRO quality gate. В core-locales остаются внутренние формулировки, например RU:
- `Все варианты конвертации в браузере`;
- `Четыре направления PSD. Единая визуальная система.`

То есть правильная архитектура — `/{locale}/convert/`, но сначала нужно довести целевую страницу.

Задача: #158 / LP-065.

**Приоритет: P0 по архитектуре, BLOCKED до качества Convert Hub.**

---

## 4. GSC: фактический поисковый сигнал Home

Период: последние 90 дней с fresh data.

| URL | Clicks | Impressions | CTR | Avg position |
|---|---:|---:|---:|---:|
| `/` | 2 | 92 | 2.17% | 48.86 |
| `/es/` | 0 | 1 | 0% | 2.0 |
| `/fr/` | 0 | 2 | 0% | 69.5 |
| `/ru/` | нет row | — | — | — |
| `/de/` | нет row | — | — | — |
| `/pt-br/` | нет row | — | — | — |
| `/ja/` | нет row | — | — | — |
| `/zh-cn/` | нет row | — | — | — |

Отсутствие row не доказывает отсутствие индексации; это только отсутствие Search Analytics impressions в выбранном периоде.

### Query leakage / intent mismatch
EN Home получает отдельные показы по соседним layer/PSD intents:
- `convert image to editable layers`;
- `convert image to layers online`;
- `pdf to layers`;
- `procreate to psd converter online`;
- `psd layer extractor`;
- `psd to layers converter`.

ES Home: единичный показ по `convertir de avif a jpg` на позиции 2.

FR Home: единичные показы по `extension png` и `jpeg extension`.

### Вывод
Данных мало, но они показывают риск семантического смешения. Home не должен усиливаться exact converter-intents. Его задача — broad category + routing; exact transactional demand должен принадлежать product/tool URLs.

---

## 5. SERP-проверка broad-root стратегии

Проверены зафиксированные broad roots:
- EN: browser extensions / Chrome extensions;
- RU: расширения для браузера;
- DE: Browser-Erweiterungen;
- ES: extensiones de navegador;
- FR: extensions de navigateur;
- PT-BR: extensões de navegador;
- JA: ブラウザ拡張機能;
- ZH-CN: 浏览器扩展程序.

Выдача по broad-category формулировкам сильно занята Chrome Web Store / Google help / category/informational pages. Это смешанный и высокоуровневый интент, а не лучший transactional acquisition layer.

### Решение
Broad root на Home сохраняем для архитектуры и semantic continuity, но основной SEO-growth LayerPorter строим через узкие product/tool landing. Не пытаемся превратить Home в страницу под Pinterest, Picture Converter или конкретную конвертацию.

---

## 6. CRO-аудит: что подтвердилось, а что нет

### Подтвердилось
- H1 `Save it. Convert it. Keep moving.` и локальные аналоги менее конкретны, чем title/meta/hero lead.
- Header CTA `Explore products` / локальные аналоги добавляет ещё один заметный маршрут.
- Hero одновременно показывает Pinterest Downloader и Picture Converter; это повышает когнитивную нагрузку.
- Социального proof почти нет; текущие `No account / Fast workflows / Clear permissions` — продуктовые claims, а не social proof.
- Extensions фактически уже являются главным коммерческим направлением hero: основной black CTA ведёт в extensions, visual stage показывает два расширения.

### Не подтвердилось буквально
Тезис внешнего CRO-аудита `два равных CTA` неверен по реализации: `.btn` — чёрный primary, `.btn.secondary` — прозрачный secondary. Проблема не в отсутствии визуальной иерархии, а в самой ранней развилке и абстрактном сообщении.

### Решение
Не удалять вторичный Web Tools CTA автоматически. Сначала исправить #159, собрать нормальную baseline funnel и только потом менять H1/header/hero.

Задача будущего copy/CRO: #160 / LP-067 — BLOCKED до измерения.

---

## 7. AI-search readiness

### Уже хорошо
- понятные названия продуктов;
- конкретные product cards;
- видимая связь `browser media → extension`, `file → converter`;
- Organization + WebSite JSON-LD;
- структурированные H2/H3 секции;
- достаточно фактической продуктовой информации для извлечения.

### Слабые места
- H1 слишком слогановый и слабо отвечает на вопрос `что такое LayerPorter`;
- часть философского copy имеет низкую информационную плотность (`Useful first`, `Everything else second` и локальные аналоги);
- Home содержит много конкретных file-format сигналов, которые могут смешивать broad category с exact converter intent;
- видимые продукты не описаны на Home отдельным ItemList/SoftwareApplication graph, хотя на Extensions Hub такая структура уже есть.

### Приоритет
- Direct H1 / answer-first — P1, после #159;
- schema enrichment — P2, только как machine clarity, не как SEO-trick;
- generic FAQ на Home не добавлять без реальных вопросов/пользы.

---

## 8. Языковая редактура Home EN+7

### Общий вывод
Эти 8 Home **не являются самым плохим локализационным блоком сайта**. Они в целом читаемы и сохраняют local SEO roots. Основной дефект — translationese/маркетинговая абстракция, а не тотальная неграмотность.

### EN — IMPROVE
- H1 абстрактный;
- `Fast workflows`, `Clear permissions` — слабые generic claims;
- философский блок длиннее полезной продуктовой информации.

### RU — IMPROVE
- `Понятные разрешения`, `Быстро и по делу` — маркетинговые, слабо проверяемые/конкретные;
- H1 нормальный по языку, но слишком слогановый;
- routing в EN Convert Hub нарушает локальный flow.

### DE — IMPROVE
- в целом грамотно;
- отдельные конструкции выглядят переводными: `Produktoberfläche`, `versandfertiges JPG`, часть slogan copy;
- не требует rebuild.

### ES — IMPROVE
- в целом читаемо;
- `Sigue sin rodeos` и часть microcopy звучат рекламно/переводно;
- `selección por lotes` стоит редакторски перепроверить против естественного product-language.

### FR — IMPROVE
- наиболее заметный риск полисемии `extension`: browser extension vs file extension подтверждается GSC (`extension png`, `jpeg extension`);
- `Continuez sans détour`, часть product copy требуют native-editor pass;
- SEO-root `extensions de navigateur` сохраняем точно, не заменяем общим `extension`.

### PT-BR — IMPROVE
- в целом приемлемо;
- часть формулировок `fluxo de trabalho`, `Continue sem interrupções` звучит корпоративно/переводно;
- нужен Brazilian product-copy pass, но не rebuild.

### JA — IMPROVE
- core hero читаем;
- нижние product/tool описания местами выглядят калькой (`PSDの作業フローに移します` и подобные конструкции);
- нужен редакторский pass с сохранением exact roots `ブラウザ拡張機能`, `Chrome 拡張機能`, `オンラインツール`.

### ZH-CN — IMPROVE
- core hero и SEO-root понятны;
- часть benefit-copy слишком generic (`操作更快捷`, `权限说明清晰`);
- требуется product-editor pass, без механического переписывания keyword forms.

---

## 9. Pareto-порядок для Home

### P0.1 — #159 Home analytics
Результат: измеряем EN + 7 locale funnel по extension hub / Pinterest / Picture Converter / Web Tools.

### P0.2 — Convert Hub quality gate
Не является Home-code fix, но блокирует правильный locale routing.

### P0.3 — #158 localized Web Tools routing
После quality gate отправляем locale Home в locale Convert Hub.

### P1 — #160 Home H1 / CTA / AI clarity
После baseline analytics:
- сделать H1 конкретнее как category/router;
- сохранить broad SEO root;
- primary commercial route = extensions;
- Web Tools остаётся contextual secondary;
- проверить необходимость header CTA;
- убрать/сжать низкоинформационный marketing copy.

### P1 — language editorial pass
Не машинный перевод EN → 7 языков. Каждая локаль редактируется отдельно, exact SEO roots заморожены до отдельного доказательства.

### P2 — schema/entity clarity
Рассмотреть ItemList/SoftwareApplication graph для видимых продуктов Home без дублирования/ложных свойств.

---

## 10. Решение по статусам

| Locale | Status | Почему |
|---|---|---|
| EN | IMPROVE | SEO foundation OK, weak/abstract hero, analytics gap |
| RU | IMPROVE | SEO root OK, editorial cleanup + routing/analytics |
| DE | IMPROVE | SEO root OK, translationese + routing/analytics |
| ES | IMPROVE | SEO root OK, query leakage + routing/analytics |
| FR | IMPROVE | SEO root OK, extension/file-extension ambiguity + routing/analytics |
| PT-BR | IMPROVE | SEO root OK, editorial cleanup + routing/analytics |
| JA | IMPROVE | SEO root OK, lower-copy translationese + routing/analytics |
| ZH-CN | IMPROVE | SEO root OK, generic benefit-copy + routing/analytics |

**HOLD ни одной Home локали на текущем объёме доказательств не присваивается.**

---

## 11. Что не делаем

- не переписываем Home с нуля;
- не массово меняем title/meta;
- не удаляем broad SEO roots;
- не превращаем Home в exact converter page;
- не форсируем A/B выводы на 92 impressions;
- не публикуем social-proof цифры без подтверждения;
- не направляем locale Home в сырой locale Convert Hub до его quality gate.
