import { useCallback, useEffect, useId, useState } from 'react'
import { localeDisplayNames } from '@/shared/i18n/generated/localeMetadata'
import { resolveLanguageCode } from '@/shared/i18n/language'
import { useLocaleCode, useT } from '@/shared/i18n/react'
import { useAppRuntime } from '@/shared/runtime/AppProvider'
import { LocaleLoadError } from '@/shared/runtime/createAppRuntime'

const languageOptions = Object.entries(localeDisplayNames).map(([code, name]) => ({
  value: code,
  label: name,
}))

export const LanguageSelector = () => {
  const t = useT()
  const localeCode = useLocaleCode()
  const runtime = useAppRuntime()
  const [loadFailed, setLoadFailed] = useState(false)
  const errorId = useId()

  useEffect(() => setLoadFailed(false), [localeCode])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const languageCode = resolveLanguageCode(e.target.value)
      setLoadFailed(false)
      void runtime.setLocale(languageCode).catch(error => {
        // PersistenceNotice separately handles a failed storage write.
        if (error instanceof LocaleLoadError) setLoadFailed(true)
      })
    },
    [runtime],
  )

  const selectedLanguage = resolveLanguageCode(localeCode)

  return (
    <div className='flex w-full min-w-0 flex-col gap-1'>
      <div className='ylc-theme-select-wrap ylc-action-fill'>
        <select
          className='ylc-theme-select ylc-action-fill'
          value={selectedLanguage}
          onChange={handleChange}
          aria-label={t('content.aria.selectLanguage')}
          aria-describedby={loadFailed ? errorId : undefined}
        >
          {languageOptions.map(option => (
            <option key={option.value} value={option.value} lang={option.value.replaceAll('_', '-')}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {loadFailed ? (
        <span id={errorId} role='alert' dir='auto' className='text-xs text-[var(--ylc-danger-text)]'>
          {t('popup.languageLoadError')}
        </span>
      ) : null}
    </div>
  )
}
