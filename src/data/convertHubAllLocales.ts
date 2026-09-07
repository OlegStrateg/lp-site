import { PICTURE_CONVERTER_LOCALES } from '../../scripts/picture-converter-locales-data.mjs';
import { PICTURE_CONVERTER_FAQ_QUESTIONS } from '../../scripts/picture-converter-faq-data.mjs';
import {
  CONVERT_HUB_LOCALES as CORE_CONVERT_HUB_LOCALES,
  type ConvertHubLocale,
} from './convertHubLocales';
import { convertHubUi } from './convertHubUiLexicon';

const normalizeCode = (code: string) => code.toLowerCase().replaceAll('_', '-');
const coreByCode = new Map(
  CORE_CONVERT_HUB_LOCALES.map((locale) => [normalizeCode(locale.code), locale]),
);

function metaDescription(base: string, privacy: string) {
  const full = `${base} ${privacy}`.replace(/\s+/g, ' ').trim();
  if (full.length <= 160) return full;
  return base.length <= 160 ? base : `${base.slice(0, 157).trim()}…`;
}

function sourceBackedLocale(row: any): ConvertHubLocale {
  const core = coreByCode.get(normalizeCode(row.code));
  const ui = convertHubUi(row.code);
  const questions = (PICTURE_CONVERTER_FAQ_QUESTIONS as Record<string, string[]>)[row.code] || [];
  const localWeb = String(row.copy?.[0] || '').trim();
  const localConversion = String(row.copy?.[1] || '').trim();
  const localPdf = String(row.copy?.[2] || '').trim();
  const localPrivacy = String(row.copy?.[3] || '').trim();
  const root = String(row.root || row.seoTitle || ui.fileConverters).trim();
  const metaBase = `${ui.fileConverters}: JPG → PDF, PDF → JPG, WebP → JPG, PSD → PNG/JPG.`;

  // LP-056: Convert Hub copy is intentionally much stricter than the old LP-054
  // fallback. LP-049 product copy is reused only where its meaning matches the
  // visible block. LP-050 supplies Semrush-grounded FAQ intents. We do not invent
  // country volumes or use Picture Converter copy as fake PSD/Canva descriptions.
  return {
    code: row.code,
    lang: row.lang,
    hreflang: row.hreflang,
    name: row.name,
    route: row.route,
    dir: row.dir === 'rtl' ? 'rtl' : 'ltr',
    title: `${ui.fileConverters}: JPG, PDF, WebP, PSD | LayerPorter`,
    description: metaDescription(metaBase, localPrivacy),
    schemaName: ui.fileConverters,
    nav: {
      converters: ui.fileConverters,
      extensions: ui.extensions,
      learn: ui.learn,
      mainAria: ui.fileConverters,
      localEngine: ui.local,
      localTitle: localPrivacy,
    },
    footer: {
      tagline: localPrivacy,
      about: ui.about,
      extensions: ui.extensions,
      privacy: ui.privacy,
      terms: ui.terms,
      footerAria: ui.fileConverters,
    },
    copy: {
      language: row.name,
      heroEyebrow: ui.fileConverters,
      heroA: ui.fileConverters,
      heroB: '',
      heroBody: `${ui.choose}: JPG → PDF · PDF → JPG · WebP → JPG · PSD → PNG · PSD → JPG.`,
      proofConverters: 'JPG · PDF · WebP · PSD',
      proofChecker: 'Canva → Google Slides',
      proofLocal: ui.local,
      proofAria: ui.fileConverters,
      chooseConversion: ui.choose,
      allCurrentTools: '',
      routeAria: ui.choose,
      filesStay: localPrivacy,
      checkerJump: 'Canva → Google Slides ↓',

      // The route board already names the exact job. Avoid secondary filler text.
      jpgPdfShort: '',
      pdfJpgShort: '',
      webpJpgShort: '',
      faviconShort: '',
      psdPngShort: '',
      psdJpgShort: '',
      pngPsdShort: '',
      jpgPsdShort: '',

      popularLabel: '01',
      popularHeading: ui.popular,
      popularIntro: '',
      jpgPdfDesc: core?.copy?.jpgPdfDesc || localPdf,
      pdfJpgDesc: core?.copy?.pdfJpgDesc || '',
      webpJpgDesc: core?.copy?.webpJpgDesc || localConversion,
      faviconDesc: core?.copy?.faviconDesc || '',
      openConverter: ui.open,
      openTool: ui.open,
      jpgPdfAlt: 'JPG → PDF',
      webpJpgAlt: 'WebP → JPG',

      designLabel: '02 · PSD · PNG · JPG',
      designHeading: 'PSD → PNG · PSD → JPG · PNG → PSD · JPG → PSD',
      designIntro: '',
      psdPngDesc: core?.copy?.psdPngDesc || '',
      psdJpgDesc: core?.copy?.psdJpgDesc || '',
      pngPsdDesc: core?.copy?.pngPsdDesc || '',
      jpgPsdDesc: core?.copy?.jpgPsdDesc || '',

      compatibilityChecker: 'Canva → Google Slides',
      checkerDesc: core?.copy?.checkerDesc || '',
      openChecker: ui.open,
      analysis: '',
      fontCompatibility: '',
      fontResult: '',
      groupedObjects: '',
      groupedResult: '',
      effects: '',
      effectsResult: '',
      check: '',
      ok: '',

      chromeExtension: ui.extensions,
      extensionHeading: row.seoTitle || root,
      extensionBody: [localWeb, localConversion].filter(Boolean).join(' '),
      addChrome: core?.copy?.addChrome || 'Chrome ↗',
      seePicture: ui.learn,
      pictureAlt: row.seoTitle || root,
      pictureIconAlt: root,

      // LP-050: only EN-US question intent is directly volume-grounded in the
      // saved Semrush export; other languages are localized equivalents and make
      // no local-volume claim.
      faqLabel: '04',
      faqHeading: ui.faq,
      faq1q: questions[2] || '',
      faq1a: localPdf,
      faq2q: questions[5] || '',
      faq2a: localConversion,
      faq3q: questions[0] || '',
      faq3a: localConversion,
      faq4q: questions[6] || '',
      faq4a: localConversion,
    },
  };
}

export const ALL_CONVERT_HUB_LOCALES: ConvertHubLocale[] = PICTURE_CONVERTER_LOCALES.map(sourceBackedLocale);

if (ALL_CONVERT_HUB_LOCALES.length !== 49) {
  throw new Error(`Expected 49 canonical Convert Hub locales, got ${ALL_CONVERT_HUB_LOCALES.length}`);
}

export const ALL_CONVERT_HUB_BY_CODE = new Map(
  ALL_CONVERT_HUB_LOCALES.map((locale) => [locale.code, locale]),
);
