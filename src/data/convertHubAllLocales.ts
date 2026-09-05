import { PICTURE_CONVERTER_LOCALES } from '../../scripts/picture-converter-locales-data.mjs';
import {
  CONVERT_HUB_LOCALES as CORE_CONVERT_HUB_LOCALES,
  type ConvertHubLocale,
} from './convertHubLocales';

const coreCodes = new Set(CORE_CONVERT_HUB_LOCALES.map((locale) => locale.code));

function sourceBackedLocale(row: any): ConvertHubLocale {
  const localConversion = row.copy?.[1] || row.meta;
  const localPdf = row.copy?.[2] || row.storeSummary || row.meta;
  const localPrivacy = row.copy?.[3] || row.meta;
  const localWeb = row.copy?.[0] || row.meta;
  const root = row.root || row.seoTitle || 'LayerPorter';

  // LP-054 conservative fallback: for languages that do not yet have a dedicated
  // Convert Hub semantic pass, reuse only already-approved v10 localized product
  // copy and language metadata. Format names/arrows remain language-neutral.
  // This deliberately avoids inventing unvalidated keyword translations.
  return {
    code: row.code,
    lang: row.lang,
    hreflang: row.hreflang,
    name: row.name,
    route: row.route,
    dir: row.dir === 'rtl' ? 'rtl' : 'ltr',
    title: `${root}: JPG · PDF · WebP · PSD | LayerPorter`,
    description: row.meta,
    schemaName: root,
    nav: {
      converters: root,
      extensions: 'Chrome',
      learn: 'LayerPorter',
      mainAria: root,
      localEngine: 'LOCAL',
      localTitle: localPrivacy,
    },
    footer: {
      tagline: localPrivacy,
      about: 'LayerPorter',
      extensions: 'Chrome',
      privacy: 'LOCAL',
      terms: 'LayerPorter',
      footerAria: root,
    },
    copy: {
      language: row.name,
      heroEyebrow: root,
      heroA: root,
      heroB: 'JPG · PNG · PDF · WebP · PSD · ICO',
      heroBody: row.meta,
      proofConverters: '8 · JPG · PDF · WebP · PSD',
      proofChecker: 'Canva → Google Slides',
      proofLocal: 'LOCAL',
      proofAria: root,
      chooseConversion: root,
      allCurrentTools: '8 + 1',
      routeAria: root,
      filesStay: localPrivacy,
      checkerJump: 'Canva → Google Slides ↓',

      jpgPdfShort: 'JPG → PDF',
      pdfJpgShort: 'PDF → JPG',
      webpJpgShort: 'WebP → JPG',
      faviconShort: 'IMG → ICO',
      psdPngShort: 'PSD → PNG',
      psdJpgShort: 'PSD → JPG',
      pngPsdShort: 'PNG → PSD',
      jpgPsdShort: 'JPG → PSD',

      popularLabel: '01 · JPG · PDF · WebP · ICO',
      popularHeading: row.seoTitle || root,
      popularIntro: row.storeSummary || row.meta,
      jpgPdfDesc: localPdf,
      pdfJpgDesc: 'PDF → JPG',
      webpJpgDesc: localConversion,
      faviconDesc: localWeb,
      openConverter: '↗',
      openTool: '↗',
      jpgPdfAlt: row.seoTitle || root,
      webpJpgAlt: row.seoTitle || root,

      designLabel: '02 · PSD · PNG · JPG',
      designHeading: 'PSD → PNG · PSD → JPG · PNG → PSD · JPG → PSD',
      designIntro: localConversion,
      psdPngDesc: localConversion,
      psdJpgDesc: localConversion,
      pngPsdDesc: localConversion,
      jpgPsdDesc: localConversion,

      compatibilityChecker: 'Canva → Google Slides',
      checkerDesc: 'PPTX · Canva → Google Slides',
      openChecker: '↗',
      analysis: 'PPTX · LOCAL',
      fontCompatibility: 'Aa',
      fontResult: '',
      groupedObjects: '▣',
      groupedResult: '',
      effects: '✦',
      effectsResult: '',
      check: '!',
      ok: '✓',

      chromeExtension: 'Chrome',
      extensionHeading: row.seoTitle || root,
      extensionBody: `${localWeb} ${localConversion}`,
      addChrome: 'Chrome ↗',
      seePicture: root,
      pictureAlt: row.seoTitle || root,
      pictureIconAlt: root,

      trustLabel: '03 · LOCAL',
      trustHeading: localPrivacy,
      noUploads: 'LOCAL',
      noUploadsDesc: localPrivacy,
      noAccount: root,
      noAccountDesc: row.storeSummary || row.meta,
      oneJob: 'JPG · PNG · PDF · WebP · PSD · ICO',
      oneJobDesc: localConversion,

      faqLabel: '04 · JPG · PNG · PDF · WebP · PSD · ICO',
      faqHeading: row.seoTitle || root,
      faq1q: 'JPG · PNG · PDF · WebP · PSD · ICO',
      faq1a: row.storeSummary || row.meta,
      faq2q: 'LOCAL',
      faq2a: localPrivacy,
      faq3q: root,
      faq3a: `${localWeb} ${localConversion}`,
      faq4q: 'JPG → PDF · PDF → JPG · WebP → JPG · PSD ↔ PNG · JPG',
      faq4a: localConversion,
    },
  };
}

const SOURCE_BACKED_LOCALES = PICTURE_CONVERTER_LOCALES
  .filter((row: any) => !coreCodes.has(row.code))
  .map(sourceBackedLocale);

export const ALL_CONVERT_HUB_LOCALES: ConvertHubLocale[] = [
  ...CORE_CONVERT_HUB_LOCALES,
  ...SOURCE_BACKED_LOCALES,
];

if (ALL_CONVERT_HUB_LOCALES.length !== 49) {
  throw new Error(`Expected 49 canonical Convert Hub locales, got ${ALL_CONVERT_HUB_LOCALES.length}`);
}

export const ALL_CONVERT_HUB_BY_CODE = new Map(
  ALL_CONVERT_HUB_LOCALES.map((locale) => [locale.code, locale]),
);
