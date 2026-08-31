import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { pinterestLocales } from "./pinterest-locales-data.mjs";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const BASE_FILE = path.join(DIST, "pinterest-downloader", "index.html");
const STORE_ID = "nmpahchhmcdejmfcmkphnbhckmlhhnon";
const ORIGIN = "https://layerporter.com";

if (!existsSync(BASE_FILE)) {
  console.error("Pinterest locale generator: base EN page is missing:", BASE_FILE);
  process.exit(1);
}
if (pinterestLocales.length !== 52) {
  console.error("Pinterest locale generator: expected 52 locales, got", pinterestLocales.length);
  process.exit(1);
}

const baseHtml = readFileSync(BASE_FILE, "utf8");

const escapeHtml = (s="") => String(s)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const escapeAttr = escapeHtml;

function urlFor(locale) {
  return locale.code === "en"
    ? `${ORIGIN}/pinterest-downloader/`
    : `${ORIGIN}/${locale.route}/pinterest-downloader/`;
}

function fileFor(locale) {
  return locale.code === "en"
    ? BASE_FILE
    : path.join(DIST, locale.route, "pinterest-downloader", "index.html");
}

function replaceRequired(html, from, to, label) {
  if (!html.includes(from)) {
    throw new Error(`Pinterest locale generator: missing marker "${label}"`);
  }
  return html.replace(from, to);
}

const alternates = pinterestLocales
  .map(l => `<link rel="alternate" hreflang="${escapeAttr(l.lang)}" href="${urlFor(l)}">`)
  .join("\n")
  + `\n<link rel="alternate" hreflang="x-default" href="${urlFor(pinterestLocales.find(x => x.code === "en"))}">`;

const localeMenuCss = `
<style>
.locale-menu{position:relative;margin-left:auto}
.locale-menu summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:#fff;font-size:10px;font-weight:900;line-height:1}
.locale-menu summary::-webkit-details-marker{display:none}
.locale-menu summary:after{content:"▾";font-size:8px;color:#888}
.locale-menu[open] summary{background:#111;color:#fff}
.locale-list{position:absolute;right:0;top:calc(100% + 8px);z-index:120;width:min(430px,82vw);max-height:360px;overflow:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:0 22px 55px rgba(20,20,20,.16)}
.locale-list a{display:flex;align-items:center;justify-content:center;min-height:34px;padding:7px 6px;border-radius:7px;color:#666;font-size:10px;font-weight:850}
.locale-list a:hover{background:#f2f2ef;color:#111}
.locale-list a[aria-current="page"]{background:#111;color:#fff}
@media(max-width:760px){.locale-list{grid-template-columns:repeat(3,1fr);right:-60px}.locale-menu summary{padding:7px 9px}}
</style>`;

function localeMenu(current) {
  const links = pinterestLocales.map(l => {
    const href = l.code === "en" ? "/pinterest-downloader/" : `/${l.route}/pinterest-downloader/`;
    const currentAttr = l.code === current.code ? ' aria-current="page"' : "";
    const hold = l.hold ? " ·" : "";
    return `<a href="${href}" lang="${escapeAttr(l.lang)}"${currentAttr}>${escapeHtml(l.code.toUpperCase().replace("_","-"))}${hold}</a>`;
  }).join("");
  return `<details class="locale-menu"><summary aria-label="Language">${escapeHtml(current.code.toUpperCase().replace("_","-"))}</summary><div class="locale-list">${links}</div></details>`;
}

function seoTitle(l) {
  return `${l.root} — ${l.videos}, ${l.images} & GIF | LayerPorter`;
}

function metaDescription(l) {
  const value = `${l.root}: ${l.intro}`;
  return value.length <= 180 ? value : value.slice(0, 177).replace(/\s+\S*$/, "") + "…";
}

function patchBody(html, l) {
  // Primary user-visible conversion copy.
  html = html.replace(/<h1>[\s\S]*?<\/h1>/, `<h1>${escapeHtml(l.root)}: ${escapeHtml(l.videos)}, ${escapeHtml(l.images)} &amp; GIF</h1>`);
  html = html.replace(/<p class="hero-copy">[\s\S]*?<\/p>/, `<p class="hero-copy">${escapeHtml(l.intro)}</p>`);
  html = html.replace(/<div class="eyebrow"><span class="mark">↓<\/span>[\s\S]*?<\/div>/, `<div class="eyebrow"><span class="mark">↓</span> ${escapeHtml(l.root)} · Chrome</div>`);

  // Localize every install CTA while preserving href/attributes.
  html = html.replace(/(<a[^>]+class="[^"]*install-link[^"]*"[^>]*>)[\s\S]*?(<\/a>)/g, (_, a, b) => `${a}${escapeHtml(l.cta)} <span>↗</span>${b}`);

  // Attribute Store clicks to locale.
  html = html.replace(/utm_term=[^"&]+/g, `utm_term=${encodeURIComponent(l.code)}`);

  // Hero support copy and chips.
  html = html.replace(/<div class="micro">[\s\S]*?<\/div>/, `<div class="micro">${escapeHtml(l.singleText)}</div>`);
  html = html.replace(/<ul class="proofline">[\s\S]*?<\/ul>/, `<ul class="proofline"><li>${escapeHtml(l.videos)}</li><li>${escapeHtml(l.images)}</li><li>GIF</li><li>${escapeHtml(l.boards)}</li><li>${escapeHtml(l.bulk)}</li><li>ZIP</li></ul>`);
  html = html.replace(/<div class="promise">[\s\S]*?<\/div>/, `<div class="promise"><span>${escapeHtml(l.root)}:</span> ${escapeHtml(l.singleText)}</div>`);

  // Product demo labels.
  html = html.replace(/<div class="side-row"><strong>[\s\S]*?<\/strong><span id="foundCount">[\s\S]*?<\/span><\/div>/, `<div class="side-row"><strong>${escapeHtml(l.root)}</strong><span id="foundCount">24</span></div>`);
  html = html.replace(/<div class="side-sub">[\s\S]*?<\/div>/, `<div class="side-sub">${escapeHtml(l.singleTitle)}</div>`);
  html = html.replace(/(<button class="filter" data-filter="image" type="button">)[\s\S]*?(<\/button>)/, `$1${escapeHtml(l.images)}$2`);
  html = html.replace(/(<button class="filter" data-filter="video" type="button">)[\s\S]*?(<\/button>)/, `$1${escapeHtml(l.videos)}$2`);
  html = html.replace(/<span class="count-live" id="heroSelected">[\s\S]*?<\/span>/, `<span class="count-live" id="heroSelected">3 ${escapeHtml(l.selected)}</span>`);
  html = html.replace(/<button class="zip demo-action" type="button">[\s\S]*?<\/button>/, `<button class="zip demo-action" type="button">${escapeHtml(l.downloadZip)}</button>`);
  html = html.replace(/<div class="float-proof">[\s\S]*?<\/div><\/div>/, `<div class="float-proof"><i>↓</i><div><strong>${escapeHtml(l.singleTitle)}</strong><small>${escapeHtml(l.singleText)}</small></div></div>`);

  // Replace the three task cards.
  html = html.replace(/<section class="wrap"><div class="task-strip reveal">[\s\S]*?<\/div><\/section>/,
    `<section class="wrap"><div class="task-strip reveal"><div><b>PIN</b><small>${escapeHtml(l.singleTitle)}</small></div><div><b>${escapeHtml(l.bulk)}</b><small>${escapeHtml(l.bulkTitle)}</small></div><div><b>ZIP</b><small>${escapeHtml(l.bulkText)}</small></div></div></section>`);

  // Single section.
  html = html.replace("01 · SINGLE PIN", "01 · PIN");
  html = html.replace("The button is already where you need it.", escapeHtml(l.singleTitle));
  html = html.replace("Open Pinterest, find the image, video or GIF you want, and use the download action directly on the page. No second downloader tab.", escapeHtml(l.singleText));
  html = html.replace(/<div class="single-copy">[\s\S]*?<\/div><\/div>\s*<\/section>/,
    `<div class="single-copy"><span class="num">PIN · CHROME</span><h3>${escapeHtml(l.singleTitle)}</h3><p>${escapeHtml(l.singleText)}</p><ul><li>${escapeHtml(l.images)} <span>↓</span></li><li>${escapeHtml(l.videos)} <span>↓</span></li><li>GIF <span>↓</span></li></ul></div></div></section>`);

  // Bulk section.
  html = html.replace("02 · BULK", "02 · ZIP");
  html = html.replace("A whole board? Select first. Download once.", escapeHtml(l.bulkTitle));
  html = html.replace("Stop opening Pins one by one. Collect available media, keep only what matters, and download the selected batch together.", escapeHtml(l.bulkText));
  html = html.replace(/<div class="bulk-copy">[\s\S]*?<\/div>\s*<div class="bulk-ui">/,
    `<div class="bulk-copy"><span>PIN · ZIP</span><h3>${escapeHtml(l.bulkTitle)}</h3><p>${escapeHtml(l.bulkText)}</p></div><div class="bulk-ui">`);
  html = html.replace(/<div class="bulk-top"><strong>[\s\S]*?<\/strong><span id="bulkTopCount">[\s\S]*?<\/span><\/div>/,
    `<div class="bulk-top"><strong>${escapeHtml(l.boards)}</strong><span id="bulkTopCount">6 ${escapeHtml(l.selected)}</span></div>`);
  html = html.replace(/<div class="bulk-footer"><span id="bulkCount">[\s\S]*?<\/span><button class="demo-action" type="button">[\s\S]*?<\/button><\/div>/,
    `<div class="bulk-footer"><span id="bulkCount">6 ${escapeHtml(l.selected)} · ${escapeHtml(l.images)} · ${escapeHtml(l.videos)} · GIF</span><button class="demo-action" type="button">${escapeHtml(l.downloadZip)} ↓</button></div>`);

  // Replace friction block with locale copy rather than leaving English.
  html = html.replace(/<section class="wrap section reveal"><div class="loop">[\s\S]*?<\/section>/,
    `<section class="wrap section reveal"><div class="loop"><div><div class="section-number">03 · PIN → ZIP</div><h2>${escapeHtml(l.singleText)}</h2></div><div class="flow-compare"><div class="flow-row old"><b>PIN</b><div><span>${escapeHtml(l.singleTitle)}</span><i>→</i><span>${escapeHtml(l.images)} / ${escapeHtml(l.videos)} / GIF</span></div></div><div class="flow-row new"><b>ZIP</b><div><span>${escapeHtml(l.bulkTitle)}</span><i>→</i><span>${escapeHtml(l.downloadZip)}</span></div></div></div></div></section>`);

  // Extra-value section.
  html = html.replace("04 · EXTRA VALUE", "04 · WEB");
  html = html.replace("Pinterest first. Images elsewhere too.", escapeHtml(l.finalTitle));
  html = html.replace("Pinterest remains the primary workflow for videos, images and GIFs. On other supported pages, the extension can also collect and download images.", escapeHtml(l.intro));
  html = html.replace("Collect images", escapeHtml(l.images));
  html = html.replace("Select several", escapeHtml(l.bulk));
  html = html.replace("Save directly", escapeHtml(l.singleTitle));

  // FAQ: use locale copy, no residual English questions.
  html = html.replace(/<section class="wrap faq reveal" id="faq">[\s\S]*?<\/section>/,
    `<section class="wrap faq reveal" id="faq"><div class="faq-grid"><div><div class="section-number">05 · FAQ</div><h2>FAQ</h2></div><div><details open><summary><span>01</span>${escapeHtml(l.root)}<i>+</i></summary><p>${escapeHtml(l.intro)}</p></details><details><summary><span>02</span>PIN<i>+</i></summary><p>${escapeHtml(l.singleText)}</p></details><details><summary><span>03</span>ZIP<i>+</i></summary><p>${escapeHtml(l.bulkText)}</p></details></div></div></section>`);

  // Final conversion section.
  html = html.replace("Keep the Pin. Skip the detour.", escapeHtml(l.finalTitle));
  html = html.replace("Download Pinterest images, videos and GIFs from the page — one item or a selected batch.", escapeHtml(l.intro));
  html = html.replace(/<div class="final-meta">[\s\S]*?<\/div>/,
    `<div class="final-meta">${escapeHtml(l.videos)} · ${escapeHtml(l.images)} · GIF · ${escapeHtml(l.boards)} · ${escapeHtml(l.bulk)} · ZIP</div>`);
  html = html.replace(/<div class="wrap signal reveal" aria-label="[^"]*">[\s\S]*?<\/div>/,
    `<div class="wrap signal reveal" aria-label="Pinterest"><span>PIN</span><span>${escapeHtml(l.videos)}</span><span>${escapeHtml(l.images)}</span><span>GIF</span><span>${escapeHtml(l.bulk)}</span><span>ZIP</span></div>`);
  html = html.replace(/<footer>[\s\S]*?<\/footer>/, `<footer><div class="wrap footer-row"><span>LayerPorter</span><span>${escapeHtml(l.root)}</span></div></footer>`);

  // Motion JS must update counters in the page language.
  html = html.replace("n + ' selected · Images · Videos · GIFs'", `n + ' ${String(l.selected).replaceAll("'","\\'")} · ${String(l.images).replaceAll("'","\\'")} · ${String(l.videos).replaceAll("'","\\'")} · GIF'`);
  html = html.replace("(i + 1) + ' selected'", `(i + 1) + ' ${String(l.selected).replaceAll("'","\\'")}'`);
  html = html.replace("showToast('Install Pinterest Downloader to use this download action.');", `showToast(${JSON.stringify(l.cta + " — Chrome")});`);

  // Low-value demo strings: make them language-neutral instead of leaving English.
  html = html.replaceAll(">Fashion<", ">PIN<")
    .replaceAll(">Travel<", ">PIN<")
    .replaceAll(">Interior<", ">PIN<")
    .replaceAll(">Editorial<", ">PIN<")
    .replaceAll(">Workspace<", ">PIN<")
    .replaceAll(">Color<", ">PIN<")
    .replaceAll(">IMAGE<", `>${escapeHtml(l.images).toUpperCase()}<`)
    .replaceAll(">VIDEO<", `>${escapeHtml(l.videos).toUpperCase()}<`)
    .replaceAll(">All<", ">✓<")
    .replaceAll("JPG · original quality", "JPG")
    .replaceAll("MP4 · video", "MP4")
    .replaceAll("GIF · animated", "GIF");

  return html;
}

function makePage(locale) {
  let html = baseHtml;
  const canonical = urlFor(locale);

  html = html.replace(/<html[^>]*>/, `<html lang="${escapeAttr(locale.lang)}"${locale.dir ? ` dir="${locale.dir}"` : ""}>`);
  html = html.replace(/<body([^>]*)>/, `<body$1 data-locale="${escapeAttr(locale.code)}" data-index-status="${locale.hold ? "hold" : "candidate"}">`);

  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeAttr(metaDescription(locale))}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`);
  html = html.replace(/\s*<link rel="alternate" hreflang="[^"]+" href="[^"]+">/g, "");
  html = html.replace(`<link rel="canonical" href="${canonical}">`, `<link rel="canonical" href="${canonical}">\n${alternates}`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(seoTitle(locale))}</title>`);
  html = html.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="index,follow">');
  html = html.replace("</head>", `<meta name="lp-locale" content="${escapeAttr(locale.code)}">\n<meta name="lp-index-status" content="${locale.hold ? "hold" : "candidate"}">\n${localeMenuCss}\n</head>`);

  // Header navigation is language-neutral; menu contains all 52 crawlable links.
  html = html.replace(/<nav class="nav-center">[\s\S]*?<\/nav>/, '<nav class="nav-center"><a href="#single">PIN</a><a href="#bulk">ZIP</a><a href="#faq">FAQ</a></nav>');
  html = html.replace(/<nav class="lang-switch"[\s\S]*?<\/nav>/, localeMenu(locale));

  html = patchBody(html, locale);

  // Ensure every Store URL is the correct product and locale-attributed.
  if (!html.includes(STORE_ID)) throw new Error(`Missing Store ID for ${locale.code}`);
  if (!html.includes(`utm_term=${encodeURIComponent(locale.code)}`)) throw new Error(`Missing UTM locale for ${locale.code}`);

  return html;
}

const manifest = [];

for (const locale of pinterestLocales) {
  const html = makePage(locale);
  const file = fileFor(locale);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, html, "utf8");

  const expectedCanonical = urlFor(locale);
  const hreflangCount = (html.match(/rel="alternate" hreflang=/g) || []).length;
  const checks = {
    localeMeta: html.includes(`name="lp-locale" content="${locale.code}"`),
    lang: html.includes(`<html lang="${locale.lang}"`),
    canonical: html.includes(`rel="canonical" href="${expectedCanonical}"`),
    robots: html.includes('meta name="robots" content="index,follow"'),
    utm: html.includes(`utm_term=${encodeURIComponent(locale.code)}`),
    root: html.includes(escapeHtml(locale.root)),
    hreflang: hreflangCount === 53,
    store: html.includes(STORE_ID),
  };
  const failed = Object.entries(checks).filter(([,ok]) => !ok).map(([k]) => k);
  if (failed.length) {
    throw new Error(`Locale ${locale.code} failed static checks: ${failed.join(", ")}; hreflang=${hreflangCount}`);
  }
  manifest.push({
    code: locale.code,
    route: locale.route || "",
    lang: locale.lang,
    root: locale.root,
    hold: Boolean(locale.hold),
    url: expectedCanonical,
    file: path.relative(DIST, file),
  });
}

writeFileSync(path.join(DIST, "pinterest-locales.json"), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(
  path.join(DIST, "pinterest-locales.tsv"),
  manifest.map(x => [x.code, x.route || "en", x.hold ? "research-hold" : "candidate"].join("\t")).join("\n") + "\n"
);

const hold = manifest.filter(x => x.hold).map(x => x.code);
console.log(`Pinterest locale generator: PASS — ${manifest.length}/52 pages`);
console.log(`  candidate: ${manifest.length - hold.length}`);
console.log(`  research-hold/indexed: ${hold.length} [${hold.join(", ")}]`);
console.log("  all pages: self-canonical + 53 alternate tags + locale UTM + index,follow");
