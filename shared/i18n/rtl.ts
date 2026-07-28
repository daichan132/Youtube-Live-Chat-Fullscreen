import { rtlBaseLocales } from './generated/localeMetadata'

export const isRTL = (languageCode: string): boolean =>
  rtlBaseLocales.includes(languageCode.replaceAll('-', '_').split('_')[0] as (typeof rtlBaseLocales)[number])
