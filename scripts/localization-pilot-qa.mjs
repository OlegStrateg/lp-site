import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("localization/pilot-picture-converter");
const source = JSON.parse(fs.readFileSync(path.join(ROOT, "02-translation-safe-source.json"), "utf8"));
const draftsDir = path.join(ROOT, "drafts");
const draftFiles = fs.readdirSync(draftsDir).filter((x) => x.endsWith(".json")).sort();

const PLACEHOLDER_RE = /\$[A-Z][A-Z0-9_]*\$/g;
const chromeLocales = new Set(["ru","de","es_419","pt_BR","fr","ja","ko","ar","zh_CN"]);

function uniq(xs) { return [...new Set(xs)]; }
function placeholders(text) { return uniq(String(text).match(PLACEHOLDER_RE) || []).sort(); }
function sameArray(a,b) { return a.length===b.length && a.every((v,i)=>v===b[i]); }
function isCjk(locale) { return locale==="ja-JP" || locale==="ko-KR" || locale==="zh-CN"; }

let block = 0;
let review = 0;
const reports = [];

for (const file of draftFiles) {
  const draft = JSON.parse(fs.readFileSync(path.join(draftsDir,file),"utf8"));
  const locale = draft.locale;
  const findings = [];
  const srcKeys = Object.keys(source.strings).sort();
  const dstKeys = Object.keys(draft.strings || {}).sort();

  const missing = srcKeys.filter((k)=>!(k in draft.strings));
  const extra = dstKeys.filter((k)=>!(k in source.strings));
  if (missing.length) findings.push({severity:"BLOCK",check:"missing_keys",keys:missing});
  if (extra.length) findings.push({severity:"BLOCK",check:"extra_keys",keys:extra});

  if (!chromeLocales.has(draft.chrome_locale)) {
    findings.push({severity:"BLOCK",check:"unsupported_chrome_locale",value:draft.chrome_locale});
  }

  const seen = new Map();
  for (const key of srcKeys) {
    if (!(key in draft.strings)) continue;
    const spec = source.strings[key];
    const target = String(draft.strings[key] ?? "");
    const src = String(spec.message ?? "");

    if (!target.trim()) findings.push({severity:"BLOCK",check:"empty_value",key});

    const sp = placeholders(src);
    const tp = placeholders(target);
    if (!sameArray(sp,tp)) {
      findings.push({severity:"BLOCK",check:"placeholder_mismatch",key,source:sp,target:tp});
    }

    if (spec.behavior === "preserve" && target !== src) {
      findings.push({severity:"BLOCK",check:"preserve_value_changed",key,source:src,target});
    }

    for (const token of spec.preserve || []) {
      if (!target.includes(token)) {
        findings.push({severity:"BLOCK",check:"preserve_token_missing",key,token});
      }
    }

    if (spec.behavior === "translate" && target === src) {
      findings.push({severity:"REVIEW",check:"unchanged_english",key});
    }

    if (!isCjk(locale) && src.length >= 8 && target.length / Math.max(1,src.length) > 1.65) {
      findings.push({
        severity:"REVIEW",
        check:"suspicious_length_growth",
        key,
        ratio:Number((target.length/src.length).toFixed(2)),
        source_len:src.length,
        target_len:target.length
      });
    }

    const normalized=target.trim().toLocaleLowerCase(locale);
    if (!seen.has(normalized)) seen.set(normalized,[]);
    seen.get(normalized).push(key);
  }

  for (const [value,keys] of seen) {
    if (keys.length>1 && value) {
      const sourceValues=uniq(keys.map(k=>source.strings[k].message));
      if (sourceValues.length>1) {
        findings.push({severity:"REVIEW",check:"duplicate_translation",keys});
      }
    }
  }

  if (locale === "fr-FR") {
    for (const [key,value] of Object.entries(draft.strings)) {
      if (/[A-Za-zÀ-ÿ0-9)] :/.test(value)) {
        findings.push({severity:"REVIEW",check:"fr_space_before_colon_not_nbsp",key});
      }
    }
  }

  if (locale === "ar") {
    for (const [key,value] of Object.entries(draft.strings)) {
      if (/\$[A-Z]/.test(value) || /Alt\+Shift\+C|HEIC|PDF|PNG|JPG|WEBP/.test(value)) {
        findings.push({severity:"REVIEW",check:"rtl_visual_smoke_required",key});
      }
    }
  }

  block += findings.filter(x=>x.severity==="BLOCK").length;
  review += findings.filter(x=>x.severity==="REVIEW").length;
  reports.push({
    locale,
    chrome_locale:draft.chrome_locale,
    keys:dstKeys.length,
    block:findings.filter(x=>x.severity==="BLOCK").length,
    review:findings.filter(x=>x.severity==="REVIEW").length,
    findings
  });
}

const result={
  source_keys:Object.keys(source.strings).length,
  locale_count:reports.length,
  block,
  review,
  status:block ? "BLOCK" : "PASS_WITH_REVIEW",
  locales:reports
};

fs.writeFileSync(path.join(ROOT,"qa-report.json"),JSON.stringify(result,null,2)+"\n");
console.log("PRODUCT_LOCALIZATION_QA",JSON.stringify({
  source_keys:result.source_keys,
  locale_count:result.locale_count,
  block:result.block,
  review:result.review,
  status:result.status,
  by_locale:reports.map(r=>({locale:r.locale,block:r.block,review:r.review}))
}));

if (block) process.exit(1);
