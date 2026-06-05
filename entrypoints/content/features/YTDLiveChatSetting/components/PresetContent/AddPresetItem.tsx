import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { TbPlus } from '@/shared/components/icons'
import { useYTDLiveChatStore } from '@/shared/stores'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'

export const AddPresetItem = () => {
  const addPresetEnabled = useYTDLiveChatStore(state => state.addPresetEnabled)
  const addPresetItem = useYTDLiveChatStore(state => state.addPresetItem)
  const { t } = useTranslation()
  const addItem = useCallback(() => {
    const state = useYTDLiveChatStore.getState()
    const ylcStyle: YLCStyleType = {
      bgColor: state.bgColor,
      fontColor: state.fontColor,
      membershipNameColor: state.membershipNameColor,
      fontFamily: state.fontFamily,
      fontSize: state.fontSize,
      blur: state.blur,
      space: state.space,
      alwaysOnDisplay: state.alwaysOnDisplay,
      chatOnlyDisplay: state.chatOnlyDisplay,
      userNameDisplay: state.userNameDisplay,
      userIconDisplay: state.userIconDisplay,
      superChatBarDisplay: state.superChatBarDisplay,
    }
    addPresetItem(crypto.randomUUID(), t('content.preset.addItemTitle'), ylcStyle)
  }, [addPresetItem, t])
  return (
    <button type='button' className='ylc-add-preset' onClick={() => addPresetEnabled && addItem()} disabled={!addPresetEnabled}>
      <TbPlus size={18} aria-hidden='true' />
      {t('content.preset.addMessage')}
    </button>
  )
}
