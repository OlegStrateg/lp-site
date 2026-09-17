import { CONVERT_HUB_LOCALES } from './convertHubLocales';
import { ALL_CONVERT_HUB_LOCALES } from './convertHubAllLocales';

const existing = new Set(CONVERT_HUB_LOCALES.map((locale) => locale.code));
for (const locale of ALL_CONVERT_HUB_LOCALES) {
  if (!existing.has(locale.code)) CONVERT_HUB_LOCALES.push(locale);
}

if (CONVERT_HUB_LOCALES.length !== 49) {
  throw new Error(`Expected 49 registered Convert Hub locales, got ${CONVERT_HUB_LOCALES.length}`);
}
