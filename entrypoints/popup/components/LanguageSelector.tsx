import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveLanguageCode } from '@/shared/i18n/language'
import language_codes from '@/shared/i18n/language_codes.json'

const languageOptions = Object.entries(language_codes).map(([code, name]) => ({
  value: code,
  label: name,
}))

export const LanguageSelector = () => {
  const { t, i18n } = useTranslation()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const languageCode = resolveLanguageCode(e.target.value)
      i18n.changeLanguage(languageCode)
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              message: 'language',
              language: languageCode,
            },
            () => {
              void chrome.runtime.lastError
            },
          )
        }
      })
    },
    [i18n],
  )

  const selectedLanguage = resolveLanguageCode(i18n.resolvedLanguage ?? i18n.language)

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
