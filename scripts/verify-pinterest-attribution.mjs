import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pinterestLocales } from "./pinterest-locales-data.mjs";
import { pinterestConsentCopy } from "./pinterest-consent-copy.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");

const escapeHtml = (s="") => String(s)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function fail(message) {
  console.error("pinterest-attribution-check: FAIL — " + message);
  process.exit(1);
}

if (pinterestLocales.length !== 52) fail("expected 52 locales");
if (Object.keys(pinterestConsentCopy).length !== 52) fail("expected 52 consent translations");

let pages = 0;
for (const locale of pinterestLocales) {
  const file = locale.code === "en"
    ? path.join(dist, "pinterest-downloader", "index.html")
    : path.join(dist, locale.route, "pinterest-downloader", "index.html");

  if (!existsSync(file)) fail(`missing page ${locale.code}`);
  const html = readFileSync(file, "utf8");
  const consent = pinterestConsentCopy[locale.code];

  const required = [
    ['consent dialog', 'id="privacyConsent"'],
    ['consent accept', escapeHtml(consent.accept)],
    ['consent reject', escapeHtml(consent.reject)],
    ['privacy link', 'href="/privacy/#cookies"'],
    ['consent cookie', "lp_privacy"],
    ['attribution cookie', "lp_pd_attr"],
    ['GPC', "globalPrivacyControl"],
    ['source classifier', "google_organic"],
    ['Store CTA attribution hook', "rememberAttribution(btn.dataset.cta"],
    ['index', 'meta name="robots" content="index,follow"'],
  ];
  for (const [label, needle] of required) {
    if (!html.includes(needle)) fail(`${locale.code}: missing ${label}`);
  }
  pages += 1;
}

const pdWelcome = readFileSync(path.join(root, "public", "pinterest-downloader", "welcome", "index.html"), "utf8");
for (const needle of [
  "const ATTR_COOKIE = 'lp_pd_attr'",
  "body.attribution = landingAttribution",
  "if (response.ok) deleteCookie(ATTR_COOKIE)",
  "readCookie('lp_privacy') !== 'analytics:1'",
  "webvisor:false",
  "clickmap:false",
]) {
  if (!pdWelcome.includes(needle)) fail("Pinterest welcome missing: " + needle);
}

const pcWelcome = readFileSync(path.join(root, "public", "picture-converter", "welcome", "index.html"), "utf8");
for (const needle of [
  "readCookie('lp_privacy') !== 'analytics:1'",
  "webvisor:false",
  "clickmap:false",
]) {
  if (!pcWelcome.includes(needle)) fail("Picture Converter welcome missing consent gate: " + needle);
}

const installApi = readFileSync(path.join(root, "functions", "api", "install.js"), "utf8");
for (const needle of ["install_landing", "install_organic", "ATTR_SOURCES", "attribution,"]) {
  if (!installApi.includes(needle)) fail("install API missing: " + needle);
}

const analytics = readFileSync(path.join(root, "functions", "_lib", "analytics.js"), "utf8");
for (const needle of ["Из лендинга:", "Из органики:", "Источник:", "Лендинг:"]) {
  if (!analytics.includes(needle)) fail("analytics missing: " + needle);
}

const privacy = readFileSync(path.join(root, "src", "copy", "privacy.md"), "utf8");
for (const needle of ["lp_privacy", "lp_pd_attr", "90 days", "180 days", "Chrome Web Store Limited Use", "Global Privacy Control"]) {
  if (!privacy.includes(needle)) fail("privacy policy missing: " + needle);
}

const terms = readFileSync(path.join(root, "src", "copy", "terms.md"), "utf8");
if (!terms.includes("not affiliated with, endorsed by, sponsored by, or operated by Pinterest")) {
  fail("terms missing Pinterest independence disclosure");
}

console.log(`pinterest-attribution-check: PASS — ${pages}/52 localized consent pages + welcome/API/privacy/terms`);
