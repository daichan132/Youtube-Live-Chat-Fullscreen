import { useCallback } from 'react'
import { resolveLanguageCode } from '@/shared/i18n/language'
import language_codes from '@/shared/i18n/language_codes.json'
import { useLocaleCode, useT } from '@/shared/i18n/react'
import { useAppRuntime } from '@/shared/runtime/AppProvider'
import { sendActiveTabMessage } from '../utils/sendActiveTabMessage'

const languageOptions = Object.entries(language_codes).map(([code, name]) => ({
  value: code,
  label: name,
}))

export const LanguageSelector = () => {
  const t = useT()
  const localeCode = useLocaleCode()
  const runtime = useAppRuntime()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const languageCode = resolveLanguageCode(e.target.value)
      void runtime.setLocale(languageCode)
      sendActiveTabMessage({
        message: 'language',
        language: languageCode,
      })
    },
    [runtime],
  )

  const selectedLanguage = resolveLanguageCode(localeCode)

  return (
    <div className='ylc-theme-select-wrap ylc-action-fill'>
      <select
        className='ylc-theme-select ylc-action-fill'
        value={selectedLanguage}
        onChange={handleChange}
        aria-label={t('content.aria.selectLanguage')}
      >
        {languageOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
