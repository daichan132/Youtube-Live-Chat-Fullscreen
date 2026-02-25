import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import am from './assets/am.json'
import ar from './assets/ar.json'
import bg from './assets/bg.json'
import bn from './assets/bn.json'
import ca from './assets/ca.json'
import cs from './assets/cs.json'
import da from './assets/da.json'
import de from './assets/de.json'
import el from './assets/el.json'
import en from './assets/en.json'
import en_AU from './assets/en_AU.json'
import en_GB from './assets/en_GB.json'
import en_US from './assets/en_US.json'
import es from './assets/es.json'
import es_419 from './assets/es_419.json'
import et from './assets/et.json'
import fa from './assets/fa.json'
import fi from './assets/fi.json'
import fil from './assets/fil.json'
import fr from './assets/fr.json'
import gu from './assets/gu.json'
import he from './assets/he.json'
import hi from './assets/hi.json'
import hr from './assets/hr.json'
import hu from './assets/hu.json'
import id from './assets/id.json'
import it from './assets/it.json'
import ja from './assets/ja.json'
import kn from './assets/kn.json'
import ko from './assets/ko.json'
import lt from './assets/lt.json'
import lv from './assets/lv.json'
import ml from './assets/ml.json'
import mr from './assets/mr.json'
import ms from './assets/ms.json'
import nl from './assets/nl.json'
import no from './assets/no.json'
import pl from './assets/pl.json'
import pt_BR from './assets/pt_BR.json'
import pt_PT from './assets/pt_PT.json'
import ro from './assets/ro.json'
import ru from './assets/ru.json'
import sk from './assets/sk.json'
import sl from './assets/sl.json'
import sr from './assets/sr.json'
import sv from './assets/sv.json'
import sw from './assets/sw.json'
import ta from './assets/ta.json'
import te from './assets/te.json'
import th from './assets/th.json'
import tr from './assets/tr.json'
import uk from './assets/uk.json'
import vi from './assets/vi.json'
import zh_CN from './assets/zh_CN.json'
import zh_TW from './assets/zh_TW.json'
import { getSupportedLanguageCodes, resolveLanguageCode } from './language'

const resources = {
  ar: { translation: ar },
  am: { translation: am },
  bg: { translation: bg },
  bn: { translation: bn },
  ca: { translation: ca },
  cs: { translation: cs },
  da: { translation: da },
  de: { translation: de },
  el: { translation: el },
  en: { translation: en },
  en_AU: { translation: en_AU },
  en_GB: { translation: en_GB },
  en_US: { translation: en_US },
  es: { translation: es },
  es_419: { translation: es_419 },
  et: { translation: et },
  fa: { translation: fa },
  fi: { translation: fi },
  fil: { translation: fil },
  fr: { translation: fr },
  gu: { translation: gu },
  he: { translation: he },
  hi: { translation: hi },
  hr: { translation: hr },
  hu: { translation: hu },
  id: { translation: id },
  it: { translation: it },
  ja: { translation: ja },
  kn: { translation: kn },
  ko: { translation: ko },
  lt: { translation: lt },
  lv: { translation: lv },
  ml: { translation: ml },
  mr: { translation: mr },
  ms: { translation: ms },
  nl: { translation: nl },
  no: { translation: no },
  pl: { translation: pl },
  pt_BR: { translation: pt_BR },
  pt_PT: { translation: pt_PT },
  ro: { translation: ro },
  ru: { translation: ru },
  sk: { translation: sk },
  sl: { translation: sl },
  sr: { translation: sr },
  sv: { translation: sv },
  sw: { translation: sw },
  ta: { translation: ta },
  te: { translation: te },
  th: { translation: th },
  tr: { translation: tr },
  uk: { translation: uk },
  vi: { translation: vi },
  zh_CN: { translation: zh_CN },
  zh_TW: { translation: zh_TW },
}
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: getSupportedLanguageCodes(),
    detection: {
      convertDetectedLanguage: (detectedLanguage: string) => resolveLanguageCode(detectedLanguage),
    },
    debug: false,
  })

export default i18n
