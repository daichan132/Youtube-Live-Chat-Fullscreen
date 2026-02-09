import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveLanguageCode } from '@/shared/i18n/language'
import language_codes from '@/shared/i18n/language_codes.json'

export const LanguageSelector = () => {
  const languageOptions = Object.entries(language_codes).map(([code, name]) => ({
    value: code,
    label: name,
  }))

  const { i18n } = useTranslation()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const languageCode = resolveLanguageCode(e.target.value)
      i18n.changeLanguage(languageCode)
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            message: 'language',
            language: languageCode,
          })
        }
      })
    },
    [i18n],
  )

  const selectedLanguage = resolveLanguageCode(i18n.resolvedLanguage ?? i18n.language)

  return (
    <div className="relative inline-flex items-center after:content-[''] after:absolute after:right-[15px] after:w-[10px] after:h-[7px] after:bg-[#535353] after:[clip-path:polygon(0_0,100%_0,50%_100%)] after:pointer-events-none">
      <select
        className='appearance-none min-w-[150px] h-[2.8em] py-[0.4em] pr-[calc(0.8em_+_30px)] pl-[0.8em] border border-[#d0d0d0] rounded-[3px] bg-white text-[#333333] text-[1em] cursor-pointer'
        value={selectedLanguage}
        onChange={handleChange}
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
