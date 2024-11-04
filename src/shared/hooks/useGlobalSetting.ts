import { useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useGlobalSettingStore } from '@/shared/stores'

import useChromeRuntimeMessageListener from './useChromeRuntimeMessageListener'

export const useGlobalSetting = () => {
  const [ytdLiveChat, setYTDLiveChat] = useState(useGlobalSettingStore.getState().ytdLiveChat || false)
  const { i18n } = useTranslation()
  const handleMessage = (request: {
    message: string
    ytdLiveChat?: boolean
    language?: string
  }) => {
    if (request.message === 'ytdLiveChat') {
      setYTDLiveChat(request?.ytdLiveChat || false)
    } else if (request.message === 'language') {
      i18n.changeLanguage(request?.language || 'en')
    }
  }
  useChromeRuntimeMessageListener(handleMessage)
  return { ytdLiveChat }
}
