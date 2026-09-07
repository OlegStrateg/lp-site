import { PICTURE_CONVERTER_LOCALES } from '../../scripts/picture-converter-locales-data.mjs';
import {
  CONVERT_HUB_LOCALES as CORE_CONVERT_HUB_LOCALES,
  type ConvertHubLocale,
} from './convertHubLocales';
import { CONVERT_HUB_LATEST_SEO } from './convertHubLatestSeo';

const normalizeCode = (code: string) => code.toLowerCase().replaceAll('-', '_');
const coreByCode = new Map(
  CORE_CONVERT_HUB_LOCALES.map((locale) => [normalizeCode(locale.code), locale]),
);

function buildLocale(row: any): ConvertHubLocale {
  const code = normalizeCode(row.code);
  const latest = CONVERT_HUB_LATEST_SEO[code];
  if (!latest) throw new Error(`Missing latest SEO copy for Convert Hub locale: ${row.code}`);

  const core = coreByCode.get(code);
  const title = `${latest.titleTerm}: JPG, PDF, WebP, PSD | LayerPorter`;
  const description = `${latest.hubSentence} JPG → PDF · PDF → JPG · WebP → JPG · PSD → PNG/JPG · PNG/JPG → PSD.`;

  return {
    code: row.code,
    lang: row.lang,
    hreflang: row.hreflang,
    name: row.name,
    route: row.route,
    dir: row.dir === 'rtl' ? 'rtl' : 'ltr',
    title,
    description,
    schemaName: latest.titleTerm,
    nav: core?.nav ?? {
      converters: latest.titleTerm,
      extensions: 'Chrome',
      learn: 'LayerPorter',
      mainAria: latest.titleTerm,
      localEngine: '',
      localTitle: latest.localSentence,
    },
    footer: core?.footer ?? {
      tagline: latest.hubSentence,
      about: 'LayerPorter',
      extensions: 'Chrome',
      privacy: 'Privacy',
      terms: 'Terms',
      footerAria: latest.titleTerm,
    },
    copy: {
      language: core?.copy.language ?? row.name,
      heroEyebrow: latest.titleTerm,
      heroA: latest.titleTerm,
      heroB: 'JPG · PDF · WebP · PSD',
      heroBody: latest.hubSentence,
      localSentence: latest.localSentence,

      popularLabel: 'JPG · PDF · WebP · ICO',
      designLabel: 'PSD · PNG · JPG',
      checkerLabel: 'PPTX · Canva → Google Slides',

      extensionHeading: latest.titleTerm,
      extensionBody: latest.shortV5,
      chromeExtension: core?.copy.chromeExtension ?? 'Chrome',
      addChrome: core?.copy.addChrome ?? 'Chrome ↗',
      seePicture: 'Picture Converter',
      pictureAlt: latest.titleTerm,
      pictureIconAlt: 'Picture Converter',

      jpgPdfAlt: core?.copy.jpgPdfAlt ?? `${latest.titleTerm} JPG PDF`,
      webpJpgAlt: core?.copy.webpJpgAlt ?? `${latest.titleTerm} WebP JPG`,
    },
  };
}

export const ALL_CONVERT_HUB_LOCALES: ConvertHubLocale[] = PICTURE_CONVERTER_LOCALES.map(buildLocale);

if (ALL_CONVERT_HUB_LOCALES.length !== 49) {
  throw new Error(`Expected 49 canonical Convert Hub locales, got ${ALL_CONVERT_HUB_LOCALES.length}`);
}

const codes = new Set(ALL_CONVERT_HUB_LOCALES.map((locale) => normalizeCode(locale.code)));
if (codes.size !== 49) throw new Error(`Expected 49 unique Convert Hub locale codes, got ${codes.size}`);

export const ALL_CONVERT_HUB_BY_CODE = new Map(
  ALL_CONVERT_HUB_LOCALES.map((locale) => [locale.code, locale]),
);
