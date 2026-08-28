import { useCallback } from 'react'
import { localeDisplayNames } from '@/shared/i18n/generated/localeMetadata'
import { resolveLanguageCode } from '@/shared/i18n/language'
import { useLocaleCode, useT } from '@/shared/i18n/react'
import { useAppRuntime } from '@/shared/runtime/AppProvider'

const languageOptions = Object.entries(localeDisplayNames).map(([code, name]) => ({
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
      void runtime.setLocale(languageCode).catch(() => {
        // PersistenceNotice exposes the handled storage failure.
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
