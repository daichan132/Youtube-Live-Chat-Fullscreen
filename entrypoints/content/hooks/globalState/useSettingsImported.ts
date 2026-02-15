import { useEffect } from 'react'
import { useMessage } from '@/shared/hooks/useMessage'
import { useGlobalSettingStore } from '@/shared/stores/globalSettingStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
import { useChangeYLCStyle } from '../ylcStyleChange/useChangeYLCStyle'

export const useSettingsImported = () => {
  const { message } = useMessage<{ message: 'settingsImported' }>()
  const changeYLCStyle = useChangeYLCStyle()

  useEffect(() => {
    if (message?.message !== 'settingsImported') return

    const rehydrateAndApply = async () => {
      await useGlobalSettingStore.persist.rehydrate()
      await useYTDLiveChatStore.persist.rehydrate()

      const { fontSize, fontFamily, bgColor, blur, fontColor, userNameDisplay, space, userIconDisplay, superChatBarDisplay } =
        useYTDLiveChatStore.getState()

      changeYLCStyle({ bgColor, blur, fontColor, fontFamily, fontSize, space, userNameDisplay, userIconDisplay, superChatBarDisplay })
    }

    rehydrateAndApply()
  }, [message, changeYLCStyle])
}
