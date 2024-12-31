import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import translation_en from './en.json'
import translation_es from './es.json'
import translation_id from './id.json'
import translation_ja from './ja.json'
import translation_ms from './ms.json'
import translation_th from './th.json'
import translation_tl from './tl.json'
import translation_zh_TW from './zh_TW.json'

const resources = {
  ja: {
    translation: translation_ja,
  },
  en: {
    translation: translation_en,
  },
  'zh-TW': {
    translation: translation_zh_TW,
  },
  th: {
    translation: translation_th,
  },
  tl: {
    translation: translation_tl,
  },
  ms: {
    translation: translation_ms,
  },
  id: {
    translation: translation_id,
  },
  es: {
    translation: translation_es,
  },
}

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
  debug: false,
})

export default i18n
