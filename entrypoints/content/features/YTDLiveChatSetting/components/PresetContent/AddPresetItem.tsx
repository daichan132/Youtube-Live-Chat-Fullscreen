import { useYTDLiveChatStore } from '@/shared/stores'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'
import classNames from 'classnames'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { MdAdd } from 'react-icons/md'
import { v4 as uuidv4 } from 'uuid'
import { useShallow } from 'zustand/react/shallow'

export const AddPresetItem = () => {
  const { addPresetEnabled, addPresetItem } = useYTDLiveChatStore(
    useShallow(state => ({
      addPresetEnabled: state.addPresetEnabled,
      addPresetItem: state.addPresetItem,
    })),
  )
  const { t } = useTranslation()
  const addItem = useCallback(() => {
    const state = useYTDLiveChatStore.getState()
    const ylcStyle: YLCStyleType = {
      bgColor: state.bgColor,
      fontColor: state.fontColor,
      fontFamily: state.fontFamily,
      fontSize: state.fontSize,
      blur: state.blur,
      space: state.space,
      alwaysOnDisplay: state.alwaysOnDisplay,
      chatOnlyDisplay: state.chatOnlyDisplay,
      userNameDisplay: state.userNameDisplay,
      userIconDisplay: state.userIconDisplay,
      reactionButtonDisplay: state.reactionButtonDisplay,
      superChatBarDisplay: state.superChatBarDisplay,
    }
    addPresetItem(uuidv4(), t('content.preset.addItemTitle'), ylcStyle)
  }, [addPresetItem, t])
  return (
    <div
      className={classNames(
        'bg-white border-1 border-solid border-[rgba(0,0,0,0.1)] m-[10px] py-[1.25rem] px-[1rem] rounded-[5px] transition-colors duration-200 flex justify-center items-center cursor-pointer',
        !addPresetEnabled && 'bg-[rgba(0,0,0,0.1)] opacity-[0.35] cursor-not-allowed',
      )}
      onClick={() => addPresetEnabled && addItem()}
      onKeyDown={() => {}}
    >
      <MdAdd size={20} /> <div>{t('content.preset.addMessage')}</div>
    </div>
  )
}
