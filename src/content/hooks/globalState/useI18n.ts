import { useMessage } from '@/shared/hooks/useMessage'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export const useI18n = () => {
  const { i18n } = useTranslation()
  const { message: languageMessage } = useMessage<{ message: 'language'; language: string }>()

  useEffect(() => {
    if (languageMessage?.message === 'language') {
      i18n.changeLanguage(languageMessage.language)
    }
  }, [languageMessage, i18n])
}
