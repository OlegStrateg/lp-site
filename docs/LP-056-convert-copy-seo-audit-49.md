# LP-056 — CRO / Copy / SEO audit of `/convert/` across 49 locales

Status: AUDIT — DO NOT DEPLOY COPY CHANGES YET

## Scope

Audit all 49 canonical `/convert/` locale pages as a converter catalog. The page must help a visitor choose a conversion quickly. It must not read like a design presentation, internal product note, or recycled Picture Converter landing page.

## Verification methods

1. **CRO / user comprehension** — page intent, hierarchy, CTA clarity, language continuity after click, removal of internal/designer language.
2. **Copy / native-language quality** — sentences must read naturally in the target language; no literal English structure, symbol-only CTA, technical placeholders, or unrelated product copy.
3. **SEO / technical** — title, description, H1/H2, canonical, hreflang, schema, sitemap, image metadata, and semantic equivalence between hreflang pages.

## Global findings

### P0 — 41 locales are not real Convert Hub localizations

`src/data/convertHubAllLocales.ts` creates every non-core locale with `sourceBackedLocale()` and reuses `row.meta`, `row.storeSummary`, `row.copy[0..3]`, `row.root`, and `row.seoTitle` from **Picture Converter** localization data.

Result: the converter catalog can contain copy about website-image downloading, HEIC/AVIF, combining 30 images into a PDF, Picture Converter terminology, generic `LOCAL`, and CTA values that are only `↗`.

This is a content-model error, not a translation typo. The fallback must be removed.

### P0 — even the 8 core locales contain internal/designer copy

Examples from EN/RU source:

- `All browser conversion routes` / `Все варианты конвертации в браузере`
- `Choose the exact route` / `Выберите нужное преобразование`
- `The main conversion jobs, shown the way they actually work.`
- `Real product imagery where it explains the task.`
- `Four PSD routes. One consistent visual system.`
- `Everything else, below the tools.` / `Дополнительные детали — после инструментов.`

These sentences describe the design or information architecture rather than helping the user convert a file.

### P0 — localized hubs break language continuity

Converter cards and hero routes are hard-coded to English paths such as `/convert/jpg-to-pdf/`, `/convert/pdf-to-jpg/`, etc. The localized hub therefore sends the visitor to an English tool page after click.

This is a separate CRO/i18n issue. Do not pretend a fully localized conversion journey exists until child tool pages are localized.

### P1 — 41 locale SEO signals do not describe the page accurately

For fallback locales:

- `title` is assembled from Picture Converter `root`;
- `description` is Picture Converter `row.meta`;
- `schemaName` is Picture Converter `root`;
- visible section copy is reused from extension/store descriptions.

Canonical/hreflang mechanics may be technically correct, but content equivalence and page intent are weak.

### P1 — long-language layout is not sufficiently protected

Russian already shows oversized heading overflow. `overflow-wrap:anywhere` hides the structural problem by allowing ugly arbitrary word breaks. Long Latin, Cyrillic, RTL and Indic locales need responsive typography and representative visual regression checks.

### P1 — useful technical foundations that should be preserved

- one canonical locale per language;
- reciprocal hreflang + x-default;
- self canonical;
- locale-aware `lang` / `dir`;
- sitemap entries;
- `primaryImageOfPage` and dedicated `/og/convert.png`;
- shared component instead of 49 duplicated templates;
- responsive images and explicit dimensions.

## Locale-by-locale status

Legend:

- **REWRITE** — dedicated Convert Hub copy exists, but CRO/copywriter pass is required.
- **CRITICAL** — generated from Picture Converter fallback and must be replaced with explicit Convert Hub copy.

| Locale | Language | Status | Main issue |
|---|---|---|---|
| en | English | REWRITE | Internal/design language; FAQ and section headings weak |
| ru | Русский | REWRITE | Literal/technical copy; long-heading overflow; awkward FAQ wording |
| de | Deutsch | REWRITE | Dedicated copy exists but requires native CRO pass and long-word layout check |
| es | Español | REWRITE | Dedicated copy exists but requires native CRO/SEO pass |
| fr | Français | REWRITE | Dedicated copy exists but requires native CRO/SEO pass |
| pt-BR | Português (Brasil) | REWRITE | Dedicated copy exists but requires native CRO/SEO pass |
| ja | 日本語 | REWRITE | Dedicated copy exists; needs native brevity/line-break pass |
| zh-CN | 简体中文 | REWRITE | Dedicated copy exists; needs native brevity/SEO pass |
| am | አማርኛ | CRITICAL | Picture Converter fallback |
| ar | العربية | CRITICAL | Picture Converter fallback + RTL review required |
| bg | Български | CRITICAL | Picture Converter fallback |
| bn | বাংলা | CRITICAL | Picture Converter fallback |
| ca | Català | CRITICAL | Picture Converter fallback |
| cs | Čeština | CRITICAL | Picture Converter fallback |
| da | Dansk | CRITICAL | Picture Converter fallback |
| el | Ελληνικά | CRITICAL | Picture Converter fallback |
| et | Eesti | CRITICAL | Picture Converter fallback |
| fa | فارسی | CRITICAL | Picture Converter fallback + RTL review required |
| fi | Suomi | CRITICAL | Picture Converter fallback |
| fil | Filipino | CRITICAL | Picture Converter fallback |
| gu | ગુજરાતી | CRITICAL | Picture Converter fallback |
| he | עברית | CRITICAL | Picture Converter fallback + RTL review required |
| hi | हिन्दी | CRITICAL | Picture Converter fallback |
| hr | Hrvatski | CRITICAL | Picture Converter fallback |
| hu | Magyar | CRITICAL | Picture Converter fallback |
| id | Bahasa Indonesia | CRITICAL | Picture Converter fallback |
| it | Italiano | CRITICAL | Picture Converter fallback |
| kn | ಕನ್ನಡ | CRITICAL | Picture Converter fallback |
| ko | 한국어 | CRITICAL | Picture Converter fallback |
| lt | Lietuvių | CRITICAL | Picture Converter fallback |
| lv | Latviešu | CRITICAL | Picture Converter fallback |
| ml | മലയാളം | CRITICAL | Picture Converter fallback |
| mr | मराठी | CRITICAL | Picture Converter fallback |
| ms | Bahasa Melayu | CRITICAL | Picture Converter fallback |
| nl | Nederlands | CRITICAL | Picture Converter fallback |
| no | Norsk | CRITICAL | Picture Converter fallback |
| pl | Polski | CRITICAL | Picture Converter fallback |
| ro | Română | CRITICAL | Picture Converter fallback |
| sk | Slovenčina | CRITICAL | Picture Converter fallback |
| sl | Slovenščina | CRITICAL | Picture Converter fallback |
| sr | Српски | CRITICAL | Picture Converter fallback |
| sv | Svenska | CRITICAL | Picture Converter fallback |
| sw | Kiswahili | CRITICAL | Picture Converter fallback |
| ta | தமிழ் | CRITICAL | Picture Converter fallback |
| te | తెలుగు | CRITICAL | Picture Converter fallback |
| th | ไทย | CRITICAL | Picture Converter fallback |
| tr | Türkçe | CRITICAL | Picture Converter fallback |
| uk | Українська | CRITICAL | Picture Converter fallback |
| vi | Tiếng Việt | CRITICAL | Picture Converter fallback |

Count: 49 total = 8 REWRITE + 41 CRITICAL.

## Copy architecture to use going forward

The hub should say only what a converter-catalog visitor needs.

1. **Hero** — what this page is + formats available + local/no-upload fact.
2. **Popular converters** — direct task names and one-sentence outcome.
3. **PSD / design conversions** — direct format pair + outcome; no design-process commentary.
4. **Canva → Google Slides checker** — what it checks and why the user would open it.
5. **Picture Converter** — clearly marked optional Chrome workflow for website images and additional image formats.
6. **FAQ** — actual search/user questions, not “details below the tools”.

Remove user-facing phrases that describe design decisions, visual systems, layout, route architecture, or internal implementation.

## English semantic master — required rewrite direction

Do not translate the current English literally. First replace it with a clean semantic source.

Examples of direction:

- Hero eyebrow: `File converters`
- H1: `Free file converters for JPG, PDF, WebP and PSD`
- Hero body: `Choose the conversion you need. All tools on this page run in your browser, so files are not uploaded for conversion.`
- Popular section: `Popular file converters`
- Design section: `PSD and image converters`
- FAQ heading: `File converter questions`

These are direction examples, not final SEO copy. Final strings require title/description/H1 keyword and length checks before translation.

## Required implementation gates

Before any localization deployment:

- no `sourceBackedLocale()` fallback for visible Convert Hub copy;
- every locale has explicit hub title, description, H1 and visible CTA text;
- no symbol-only CTA (`↗`) as the full CTA label;
- no unrelated Picture Converter terms in the hub body (`HEIC`, `AVIF`, website image download, `30 images`) outside the dedicated Picture Converter block;
- no internal phrases about “visual system”, “product imagery”, “route”, or “below the tools”;
- every locale passes title/meta/H1 sanity checks;
- representative screenshot checks: EN, RU, DE, AR, HE, JA, ZH-CN, HI, AM at desktop/tablet/mobile widths;
- RTL checked for AR/FA/HE;
- localized hub → English child-tool transition is explicitly acknowledged until child pages are localized;
- canonical, hreflang, sitemap, schema and OG checks remain green.

## Decision

Current 49-language publication is technically deployed but **copy quality is not acceptable as a finished localization**. Do not expand or reuse the current fallback architecture. Rewrite the semantic master, then create explicit localized hub copy locale-by-locale and verify each language before a new deployment.
