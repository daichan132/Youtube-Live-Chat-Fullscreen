import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMessage } from '@/shared/hooks/useMessage'
import { resolveLanguageCode } from '@/shared/i18n/language'

export const useI18n = () => {
  const { i18n } = useTranslation()
  const { message: languageMessage } = useMessage<{ message: 'language'; language: string }>()

  useEffect(() => {
    if (languageMessage?.message === 'language') {
      i18n.changeLanguage(resolveLanguageCode(languageMessage.language))
    }
  }, [languageMessage, i18n])
}
