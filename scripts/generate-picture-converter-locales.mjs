import fs from 'node:fs';
import path from 'node:path';
import {
  PICTURE_CONVERTER_LOCALES,
  PICTURE_CONVERTER_STORE_ID,
  PICTURE_CONVERTER_STORE_URL,
  pictureConverterUrl,
  pictureConverterPath,
} from './picture-converter-locales-data.mjs';

const root = process.cwd();
const dist = path.join(root, 'dist');
const baseFile = path.join(dist, 'picture-converter', 'index.html');

if (!fs.existsSync(baseFile)) {
  throw new Error('Missing built Picture Converter page: ' + baseFile);
}
if (PICTURE_CONVERTER_LOCALES.length !== 49) {
  throw new Error('Expected 49 Picture Converter locales');
}
const titleSet = new Set();
for (const row of PICTURE_CONVERTER_LOCALES) {
  if (row.researchTier !== 'v10-final') throw new Error('Non-final SEO source: ' + row.code);
  if (!row.seoTitle || !row.meta) throw new Error('Missing SEO title/meta: ' + row.code);
  if (row.seoTitle.length > 90) throw new Error('SEO title too long: ' + row.code + ' ' + row.seoTitle.length);
  if (row.meta.length > 160) throw new Error('Meta description too long: ' + row.code + ' ' + row.meta.length);
  const k = row.lang + '|' + row.seoTitle + '|' + row.meta;
  if (titleSet.has(k)) throw new Error('Duplicate locale SEO tuple: ' + row.code);
  titleSet.add(k);
}

const base = fs.readFileSync(baseFile, 'utf8');
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

const allAlternates = PICTURE_CONVERTER_LOCALES
  .map(row => `<link rel="alternate" hreflang="${esc(row.hreflang)}" href="${pictureConverterUrl(row)}">`)
  .join('\n') + '\n<link rel="alternate" hreflang="x-default" href="https://layerporter.com/picture-converter/">';

function storeUrl(row, content) {
  const u = new URL(PICTURE_CONVERTER_STORE_URL);
  u.searchParams.set('utm_source','layerporter');
  u.searchParams.set('utm_medium','website');
  u.searchParams.set('utm_campaign','picture-converter-landing');
  u.searchParams.set('utm_content',content);
  u.searchParams.set('utm_term',row.code);
  return u.toString();
}

function localeMenu(current) {
  return `<details class="pc-locale">
    <summary aria-label="Language">${esc(current.name)} <b>(${esc(current.code.toUpperCase())})</b></summary>
    <div class="pc-locale-menu">
      ${PICTURE_CONVERTER_LOCALES.map(row => `<a href="${pictureConverterPath(row)}" lang="${esc(row.lang)}" hreflang="${esc(row.hreflang)}"${row.code===current.code?' aria-current="page"':''}>${esc(row.name)} <b>(${esc(row.code.toUpperCase())})</b></a>`).join('')}
    </div>
  </details>`;
}

const chromeIcon = `<svg class="chrome-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <circle cx="12" cy="12" r="11" fill="#fff"/>
  <path d="M12 1a11 11 0 0 1 9.53 5.5H12a5.5 5.5 0 0 0-4.77 2.75L4.05 3.74A10.95 10.95 0 0 1 12 1Z" fill="#EA4335"/>
  <path d="M21.53 6.5A11 11 0 0 1 12 23l4.76-8.25A5.5 5.5 0 0 0 17.5 12a5.47 5.47 0 0 0-.74-2.75Z" fill="#FBBC05"/>
  <path d="M12 23A11 11 0 0 1 4.05 3.74l4.77 8.26a5.5 5.5 0 0 0 7.94 2.75Z" fill="#34A853"/>
  <circle cx="12" cy="12" r="4.25" fill="#4285F4"/>
  <circle cx="12" cy="12" r="4.25" fill="none" stroke="#fff" stroke-width=".7"/>
</svg>`;

function install(row, content, extra='') {
  return `<a class="install ${extra}" href="${esc(storeUrl(row,content))}" rel="noopener">${chromeIcon}<span>Add to Chrome</span><span aria-hidden="true">↗</span></a>`;
}

function img(name, alt, priority=false) {
  return `<img src="/images/picture-converter/${name}-960.webp"
    srcset="/images/picture-converter/${name}-320.webp 320w, /images/picture-converter/${name}-640.webp 640w, /images/picture-converter/${name}-960.webp 960w, /images/picture-converter/${name}-1440.webp 1440w"
    sizes="(max-width:760px) 100vw, 58vw" width="960" height="640" alt="${esc(alt)}"
    ${priority?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;
}

function main(row) {
  const [webCopy, localCopy, pdfCopy, privacy] = row.copy;
  const rootText = row.root;
  const seoH1 = row.root;
  return `<main data-pc-locale="${esc(row.code)}">
  <section class="wrap hero">
    <div class="hero-left">
      <div class="eyebrow"><span class="mark">⇄</span> ${esc(rootText)} · Chrome</div>
      <h1><span class="accent">${esc(seoH1)}</span></h1>
      <p class="hero-copy">${esc(row.meta)}</p>
      <div class="hero-actions">${install(row,'hero')}<div class="micro">${esc(privacy)}</div></div>
      <ul class="proofline" aria-label="Common conversions">
        <li>WebP → JPG</li><li>HEIC → JPG</li><li>AVIF → JPG</li><li>SVG → PNG</li><li>Images → PDF</li>
      </ul>
      <div class="local-line"><strong>LOCAL</strong> · ${esc(privacy)}</div>
    </div>
    <div class="product-proof">
      <div class="pc-photo-hero">
        ${img('webp-to-jpg-example', row.seoTitle, true)}
        <div class="pc-photo-overlay"><span>WEBP</span><b>→ JPG</b></div>
        <aside class="pc-mini-panel">
          <strong>${esc(rootText)}</strong>
          <div class="pc-formats"><span>PNG</span><span class="active">JPG</span><span>WEBP</span><span>PDF</span><span>ICO</span></div>
          <div class="pc-download">JPG <b>↓</b></div>
        </aside>
      </div>
    </div>
  </section>

  <section class="wrap pc-rail" aria-label="Picture Converter workflows">
    <article><b>WEBP → JPG</b></article>
    <article><b>HEIC → JPG</b></article>
    <article><b>30 → PDF</b></article>
  </section>

  <section class="wrap section" id="web">
    <div class="section-number">01</div>
    <div class="section-head">
      <h2 class="pc-seo-heading">${esc(row.seoTitle)}</h2>
      <p>${esc(webCopy)}</p>
    </div>
    <div class="pc-scene">
      <div class="pc-scene-photo">${img('website-image-converter', webCopy)}</div>
      <div class="section-copy">
        
        <h3>JPG · PNG · WebP · PDF · ICO</h3>
        <p>${esc(row.storeSummary)}</p>
        <ul><li>WebP → JPG <span>JPG</span></li><li>WebP → PNG <span>PNG</span></li><li>PNG → ICO <span>ICO</span></li></ul>
      </div>
    </div>
  </section>

  <div class="dark" id="local">
    <section class="wrap section">
      <div class="section-number">02</div>
      <div class="section-head">
        <h2>HEIC → JPG · AVIF → JPG · SVG → PNG</h2>
        <p>${esc(localCopy)}</p>
      </div>
      <div class="pc-local-grid">
        <div class="pc-local-photo">${img('heic-to-jpg-example', localCopy)}</div>
        <div class="pc-local-box">
          <strong>${esc(rootText)}</strong>
          <div class="pc-inputs"><span>WEBP</span><span>HEIC</span><span>AVIF</span><span>SVG</span><span>PNG</span><span>JPG</span></div>
          <div class="pc-arrow-flow"><b>IMG_1842.HEIC</b><i>→</i><strong>IMG_1842.JPG</strong></div>
          <small>${esc(privacy)}</small>
        </div>
      </div>
    </section>
  </div>

  <section class="wrap pdf-section" id="pdf">
    <div class="pdf-grid">
      <div class="pdf-copy"><div class="section-number">03</div><h2>30 images → one PDF</h2><p>${esc(pdfCopy)}</p></div>
      <div class="pc-pdf-visual">
        ${['webp-to-jpg-example','website-image-converter','heic-to-jpg-example','images-to-pdf-example'].map((n,i)=>`<div><span>${i+1}</span>${img(n,'')}</div>`).join('')}
      </div>
    </div>
  </section>

  <section class="wrap format-section">
    <div class="section-number">04</div>
    <div class="section-head"><h2>JPG · PNG · WebP · PDF · ICO</h2><p>${esc(localCopy)}</p></div>
    <div class="format-grid">
      <div class="format-card"><b>JPG</b><small>WebP → JPG</small></div>
      <div class="format-card"><b>PNG</b><small>SVG → PNG</small></div>
      <div class="format-card"><b>WebP</b><small>JPG → WebP</small></div>
      <div class="format-card"><b>PDF</b><small>Images → PDF</small></div>
      <div class="format-card"><b>ICO</b><small>PNG → ICO</small></div>
    </div>
  </section>

  <section class="wrap faq" id="faq">
    <div class="faq-grid">
      <div><div class="section-number">05</div><h2>${esc(rootText)}</h2></div>
      <div>
        <details open><summary><span>01</span><b>WebP → JPG / PNG</b><i>+</i></summary><p>${esc(webCopy)}</p></details>
        <details><summary><span>02</span><b>HEIC → JPG</b><i>+</i></summary><p>${esc(localCopy)}</p></details>
        <details><summary><span>03</span><b>PDF · 30</b><i>+</i></summary><p>${esc(pdfCopy)}</p></details>
        <details><summary><span>04</span><b>LOCAL</b><i>+</i></summary><p>${esc(privacy)}</p></details>
      </div>
    </div>
  </section>

  <section class="final">
    <div class="pc-final-bg">${img('picture-converter-chrome','')}</div>
    <div class="wrap pc-final-copy">
      <div class="eyebrow"><span class="mark">⇄</span> ${esc(rootText)} · Chrome</div>
      <h2>${esc(row.seoTitle)}</h2>
      <p>${esc(row.meta)}</p>
      ${install(row,'final')}
      <div class="final-meta">WEBP · HEIC · AVIF · SVG · JPG · PNG · PDF · ICO</div>
    </div>
  </section>
</main>`;
}

const extraCss = `<style id="pc-lp049">
.chrome-icon{width:20px;height:20px;flex:0 0 20px;display:block}.install{white-space:nowrap}.install span{display:inline-flex;align-items:center}
.pc-locale{position:relative}.pc-locale summary{cursor:pointer;list-style:none;font-size:11px;font-weight:800;color:#625e68}.pc-locale summary::-webkit-details-marker{display:none}
.pc-locale-menu{position:absolute;right:0;top:34px;width:min(520px,86vw);max-height:60vh;overflow:auto;display:grid;grid-template-columns:1fr 1fr;padding:10px;border:1px solid var(--line);border-radius:14px;background:#fff;box-shadow:0 22px 60px rgba(25,18,39,.16);z-index:120}
.pc-locale-menu a{padding:9px 10px;border-radius:8px;font-size:11px;color:#5d5763}.pc-locale-menu a:hover,.pc-locale-menu a[aria-current="page"]{background:var(--violet-soft);color:var(--violet)}
.pc-photo-hero{position:relative;min-height:570px;border-radius:22px;overflow:hidden;box-shadow:var(--shadow);background:#ddd}.pc-photo-hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pc-photo-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(13,10,18,.34));pointer-events:none}
.pc-photo-overlay{position:absolute;left:22px;bottom:22px;z-index:3;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);font-size:10px;font-weight:900}.pc-photo-overlay b{color:var(--violet);margin-left:8px}
.pc-mini-panel{position:absolute;right:18px;top:18px;z-index:4;width:286px;padding:16px;border-radius:16px;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);box-shadow:0 22px 55px rgba(28,20,48,.18)}
.pc-mini-panel strong{font-size:12px}.pc-formats{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:16px}.pc-formats span{padding:10px 4px;border:1px solid var(--line);border-radius:8px;text-align:center;font-size:8px;font-weight:900}.pc-formats .active{border-color:var(--violet);background:var(--violet-soft);color:var(--violet)}.pc-download{margin-top:12px;padding:13px;border-radius:9px;background:var(--violet);color:#fff;font-size:10px;font-weight:900;display:flex;justify-content:space-between}
.pc-rail{display:grid;grid-template-columns:repeat(3,1fr);margin-bottom:18px;border:1px solid var(--line);border-radius:14px;background:#fff;overflow:hidden}.pc-rail article{padding:18px;border-right:1px solid var(--line)}.pc-rail article:last-child{border-right:0}.pc-rail b{display:block;font-size:12px}.pc-rail span{display:block;margin-top:4px;color:#85808a;font-size:9px}
.pc-seo-heading{font-size:clamp(36px,4.5vw,62px)}.pc-scene{margin-top:56px;display:grid;grid-template-columns:1.15fr .85fr;min-height:570px;border:1px solid #d9d3de;border-radius:18px;overflow:hidden;background:#fff}.pc-scene-photo{position:relative;min-height:570px;background:#ddd}.pc-scene-photo img{width:100%;height:100%;object-fit:cover}.pc-scene-photo>span{position:absolute;left:20px;bottom:20px;padding:9px 11px;border-radius:9px;background:rgba(255,255,255,.92);font-size:9px;font-weight:900}
.pc-local-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:56px}.pc-local-photo,.pc-local-box{min-height:430px;border-radius:18px;overflow:hidden}.pc-local-photo img{width:100%;height:100%;object-fit:cover}.pc-local-box{padding:32px;background:#fff;color:#17161a;display:flex;flex-direction:column;justify-content:center}.pc-inputs{display:flex;flex-wrap:wrap;gap:7px;margin-top:20px}.pc-inputs span{padding:8px 9px;border-radius:8px;background:#eeeaf1;font-size:9px;font-weight:900}.pc-arrow-flow{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin-top:24px;padding:16px;border:1px solid var(--line);border-radius:12px}.pc-arrow-flow i{font-style:normal;color:var(--violet);font-size:20px}.pc-arrow-flow strong{color:var(--violet)}.pc-local-box small{margin-top:20px;color:#77717c}
.pc-pdf-visual{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:22px;border:1px solid var(--line);border-radius:18px;background:#fff}.pc-pdf-visual>div{position:relative;aspect-ratio:.72;border-radius:10px;overflow:hidden;background:#ddd}.pc-pdf-visual img{width:100%;height:100%;object-fit:cover}.pc-pdf-visual span{position:absolute;right:7px;top:7px;z-index:2;width:22px;height:22px;border-radius:7px;background:#fff;display:grid;place-items:center;font-size:8px;font-weight:900}
.format-card{min-height:130px}.format-card p{display:none}.format-card small{margin-top:18px}
.pc-final-bg{position:absolute;inset:0}.pc-final-bg img{width:100%;height:100%;object-fit:cover}.pc-final-bg:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(74,50,203,.96),rgba(57,35,173,.84))}.pc-final-copy{position:relative;z-index:2}.final{position:relative}
html[dir="rtl"] body{text-align:right}html[dir="rtl"] .hero-actions,html[dir="rtl"] .eyebrow{direction:rtl}html[dir="rtl"] .pc-locale-menu{right:auto;left:0}
@media(max-width:1060px){.pc-scene,.pc-local-grid{grid-template-columns:1fr}.pc-pdf-visual{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){.pc-locale-menu{grid-template-columns:1fr}.pc-photo-hero{min-height:500px}.pc-mini-panel{left:18px;right:18px;top:auto;bottom:18px;width:auto}.pc-photo-overlay{display:none}.pc-rail{grid-template-columns:1fr}.pc-rail article{border-right:0;border-bottom:1px solid var(--line)}.pc-rail article:last-child{border-bottom:0}.pc-pdf-visual{grid-template-columns:repeat(2,1fr)}}
</style>`;

function structuredData(row) {
  return {
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'Organization','@id':'https://layerporter.com/#org',name:'LayerPorter',url:'https://layerporter.com/'},
      {'@type':'WebPage','@id':pictureConverterUrl(row)+'#webpage',url:pictureConverterUrl(row),name:row.seoTitle,description:row.meta,inLanguage:row.lang,primaryImageOfPage:'https://layerporter.com/images/picture-converter/webp-to-jpg-example-1440.webp',publisher:{'@id':'https://layerporter.com/#org'},mainEntity:{'@id':pictureConverterUrl(row)+'#software'}},
      {'@type':'SoftwareApplication','@id':pictureConverterUrl(row)+'#software',name:row.root,applicationCategory:'BrowserApplication',operatingSystem:'Chrome',url:pictureConverterUrl(row),installUrl:PICTURE_CONVERTER_STORE_URL,description:row.storeSummary,inLanguage:row.lang,publisher:{'@id':'https://layerporter.com/#org'}}
    ]
  };
}

function render(row) {
  let html = base;
  html = html.replace(/<html\s+lang="[^"]*"[^>]*>/i, `<html lang="${esc(row.lang)}"${row.dir==='rtl'?' dir="rtl"':''}>`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(row.seoTitle)}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="description" content="${esc(row.meta)}">`);
  html = html.replace(/<meta\s+name="robots"[^>]*>/i, '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">');
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?\s*>/i, `<link rel="canonical" href="${pictureConverterUrl(row)}">`);
  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:title" content="${esc(row.seoTitle)}">`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:description" content="${esc(row.meta)}">`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:url" content="${pictureConverterUrl(row)}">`);

  html = html.replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/i,
    `<script type="application/ld+json" id="pc-jsonld">${json(structuredData(row))}</script>`);

  html = html.replace('</head>', `<meta name="lp-locale" content="${esc(row.code)}">
<meta property="og:locale" content="${esc(row.lang.replace('-','_'))}">
<meta property="og:image" content="https://layerporter.com/images/picture-converter/webp-to-jpg-example-1440.webp">
<meta property="og:image:width" content="1440">
<meta property="og:image:height" content="960">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://layerporter.com/images/picture-converter/webp-to-jpg-example-1440.webp">
${allAlternates}
${extraCss}
</head>`);

  html = html.replace(/<main[\s\S]*?<\/main>/i, main(row));

  // Header: keep brand, replace middle navigation with compact query-focused navigation and locale menu.
  html = html.replace(/<nav class="nav-center"[\s\S]*?<\/nav>/i,
    `<nav class="nav-center" aria-label="Page sections"><a href="#web">WebP → JPG</a><a href="#local">HEIC → JPG</a><a href="#pdf">PDF</a><a href="#faq">FAQ</a></nav>`);
  html = html.replace(/<a class="install"[^>]*>[\s\S]*?<\/a>/i, install(row,'header'));
  html = html.replace(/<\/div>\s*<\/header>/i, `${localeMenu(row)}</div></header>`);

  // Remove stale/duplicate alternates if a previous build shell ever contains them.
  const chunks = html.split('\n');
  const seen = new Set();
  html = chunks.filter(line => {
    if (!/rel="alternate"\s+hreflang=/.test(line)) return true;
    const m=line.match(/hreflang="([^"]+)"/);
    if (!m) return true;
    if (seen.has(m[1])) return false;
    seen.add(m[1]); return true;
  }).join('\n');

  // Correct any stale store IDs/paths that survive outside main.
  html = html.replaceAll('ooiklbnjmhbcfnllkgjahadblibecgfj', PICTURE_CONVERTER_STORE_ID)
             .replaceAll('/detail/image-converter/' + PICTURE_CONVERTER_STORE_ID, '/detail/picture-converter/' + PICTURE_CONVERTER_STORE_ID);
  return html;
}

const manifest=[];
for (const row of PICTURE_CONVERTER_LOCALES) {
  const target = row.code === 'en'
    ? baseFile
    : path.join(dist, row.route, 'picture-converter', 'index.html');
  fs.mkdirSync(path.dirname(target), {recursive:true});
  const html=render(row);
  fs.writeFileSync(target,html);
  manifest.push({code:row.code,route:row.route,lang:row.lang,hreflang:row.hreflang,url:pictureConverterUrl(row),path:pictureConverterPath(row),researchTier:row.researchTier});
}

fs.writeFileSync(path.join(dist,'picture-converter-locales.json'), JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(dist,'picture-converter-locales.tsv'), manifest.map(x=>[x.code,x.route,x.researchTier].join('\t')).join('\n')+'\n');

// Static gates.
for (const row of PICTURE_CONVERTER_LOCALES) {
  const target=row.code==='en'?baseFile:path.join(dist,row.route,'picture-converter','index.html');
  const html=fs.readFileSync(target,'utf8');
  if(!html.includes(`name="lp-locale" content="${row.code}"`)) throw new Error('Locale marker '+row.code);
  if(!html.includes(`<link rel="canonical" href="${pictureConverterUrl(row)}">`)) throw new Error('Canonical '+row.code);
  if(!html.includes('hreflang="x-default"')) throw new Error('x-default '+row.code);
  if(!html.includes(PICTURE_CONVERTER_STORE_ID)) throw new Error('Store ID '+row.code);
  if(html.includes('ooiklbnjmhbcfnllkgjahadblibecgfj')) throw new Error('Stale store ID '+row.code);
  if(!html.includes('meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"')) throw new Error('Robots '+row.code);
  if(!html.includes(`data-pc-locale="${row.code}"`)) throw new Error('Main '+row.code);
  if(!html.includes(esc(row.seoTitle))) throw new Error('Visible exact SEO title '+row.code);
  if(!html.includes(esc(row.meta))) throw new Error('Visible exact meta copy '+row.code);
  if(!html.includes('/images/picture-converter/webp-to-jpg-example-960.webp')) throw new Error('Local WebP '+row.code);
  if(html.includes('images.unsplash.com')) throw new Error('External image '+row.code);
}
if (allAlternates.includes('hreflang="es-419"')) throw new Error('Invalid Google hreflang es-419');
console.log('Picture Converter locales PASS: 49/49');
