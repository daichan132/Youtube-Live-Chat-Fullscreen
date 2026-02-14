const RTL_LANGUAGES = ['ar', 'fa', 'he', 'ur', 'yi']

export const isRTL = (languageCode: string): boolean =>
  RTL_LANGUAGES.includes(languageCode.split('-')[0])
