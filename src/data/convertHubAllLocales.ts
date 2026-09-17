import { PICTURE_CONVERTER_LOCALES } from '../../scripts/picture-converter-locales-data.mjs';
import {
  CONVERT_HUB_LOCALES as CORE_CONVERT_HUB_LOCALES,
  type ConvertHubLocale,
} from './convertHubLocales';
import { ADDITIONAL_HUB_EDITORIAL } from './convertHubAdditionalLocaleEditorial';

const normalizeCode = (code: string) => code.toLowerCase().replaceAll('_', '-');
const coreCodes = new Set(CORE_CONVERT_HUB_LOCALES.map((locale) => normalizeCode(locale.code)));

function editorialLocale(row: any): ConvertHubLocale {
  const edit = ADDITIONAL_HUB_EDITORIAL[row.code];
  if (!edit) throw new Error(`Missing Convert Hub editorial locale: ${row.code}`);

  // Picture Converter localized copy is reused ONLY inside the Picture Converter
  // cross-sell section, where it describes that product truthfully. It is never
  // reused as Convert Hub title/meta/H1/body copy.
  const pictureWeb = row.copy?.[0] || row.storeSummary || row.meta;
  const pictureConversion = row.copy?.[1] || row.meta;
  const localPrivacy = row.copy?.[3] || row.meta;

  return {
    code: row.code,
    lang: row.lang,
    hreflang: row.hreflang,
    name: row.name,
    route: row.route,
    dir: row.dir === 'rtl' ? 'rtl' : 'ltr',
    title: `${edit.root} — JPG, PDF, WebP & PSD | LayerPorter`,
    description: edit.description,
    schemaName: edit.root,
    nav: {
      converters: edit.root,
      extensions: 'Chrome',
      learn: 'LayerPorter',
      mainAria: edit.root,
      localEngine: 'LOCAL',
      localTitle: edit.local,
    },
    footer: {
      tagline: edit.local,
      about: 'LayerPorter',
      extensions: 'Chrome',
      privacy: 'Privacy',
      terms: 'Terms',
      footerAria: edit.root,
    },
    copy: {
      language: row.name,
      heroEyebrow: edit.root,
      heroA: edit.root,
      heroB: 'JPG · PNG · PDF · WebP · PSD · ICO',
      heroBody: edit.description,
      proofConverters: '8 · JPG · PDF · WebP · PSD',
      proofChecker: 'Canva → Google Slides',
      proofLocal: edit.local,
      proofAria: edit.root,
      chooseConversion: edit.choose,
      allCurrentTools: edit.allTools,
      routeAria: edit.root,
      filesStay: edit.local,
      checkerJump: 'Canva → Google Slides ↓',

      jpgPdfShort: 'JPG / PNG → PDF',
      pdfJpgShort: 'PDF → JPG',
      webpJpgShort: 'WebP → JPG',
      faviconShort: 'IMG → ICO',
      psdPngShort: 'PSD → PNG',
      psdJpgShort: 'PSD → JPG',
      pngPsdShort: 'PNG → PSD',
      jpgPsdShort: 'JPG → PSD',

      popularLabel: '01 · JPG · PDF · WebP · ICO',
      popularHeading: edit.choose,
      popularIntro: edit.description,
      jpgPdfDesc: 'JPG / PNG → PDF',
      pdfJpgDesc: 'PDF → JPG',
      webpJpgDesc: 'WebP → JPG',
      faviconDesc: 'IMG → ICO',
      openConverter: edit.open,
      openTool: edit.open,
      jpgPdfAlt: 'JPG / PNG → PDF',
      webpJpgAlt: 'WebP → JPG',

      designLabel: '02 · PSD · PNG · JPG',
      designHeading: 'PSD → PNG · PSD → JPG · PNG → PSD · JPG → PSD',
      designIntro: 'PSD · PNG · JPG',
      psdPngDesc: 'PSD → PNG',
      psdJpgDesc: 'PSD → JPG',
      pngPsdDesc: 'PNG → PSD',
      jpgPsdDesc: 'JPG → PSD',

      compatibilityChecker: 'Canva → Google Slides',
      checkerDesc: edit.checkerDesc,
      openChecker: edit.open,
      analysis: 'PPTX',
      fontCompatibility: 'Aa',
      fontResult: '',
      groupedObjects: '▣',
      groupedResult: '',
      effects: '✦',
      effectsResult: '',
      check: '!',
      ok: '✓',

      chromeExtension: 'Chrome',
      extensionHeading: row.seoTitle || row.root || 'Picture Converter',
      extensionBody: `${pictureWeb} ${pictureConversion}`,
      addChrome: 'Chrome ↗',
      seePicture: row.root || 'Picture Converter',
      pictureAlt: row.seoTitle || row.root || 'Picture Converter',
      pictureIconAlt: row.root || 'Picture Converter',

      // Legacy shape retained for the shared type; trust block is no longer rendered.
      trustLabel: '', trustHeading: '', noUploads: '', noUploadsDesc: localPrivacy,
      noAccount: '', noAccountDesc: '', oneJob: '', oneJobDesc: '',

      // No generic FAQ is published for locales without a dedicated Hub semantic pass.
      faqLabel: '', faqHeading: '', faq1q: '', faq1a: '', faq2q: '', faq2a: '',
      faq3q: '', faq3a: '', faq4q: '', faq4a: '',
    },
  };
}

const EDITORIAL_LOCALES = PICTURE_CONVERTER_LOCALES
  .filter((row: any) => !coreCodes.has(normalizeCode(row.code)))
  .map(editorialLocale);

const expectedAdditional = PICTURE_CONVERTER_LOCALES.length - CORE_CONVERT_HUB_LOCALES.length;
if (Object.keys(ADDITIONAL_HUB_EDITORIAL).length !== expectedAdditional) {
  throw new Error(`Expected ${expectedAdditional} additional Convert Hub editorial locales, got ${Object.keys(ADDITIONAL_HUB_EDITORIAL).length}`);
}

export const ALL_CONVERT_HUB_LOCALES: ConvertHubLocale[] = [
  ...CORE_CONVERT_HUB_LOCALES,
  ...EDITORIAL_LOCALES,
];

if (ALL_CONVERT_HUB_LOCALES.length !== 49) {
  throw new Error(`Expected 49 canonical Convert Hub locales, got ${ALL_CONVERT_HUB_LOCALES.length}`);
}

export const ALL_CONVERT_HUB_BY_CODE = new Map(
  ALL_CONVERT_HUB_LOCALES.map((locale) => [locale.code, locale]),
);
