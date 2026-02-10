import classNames from 'classnames'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { TbPlus } from 'react-icons/tb'
import { v4 as uuidv4 } from 'uuid'
import { useShallow } from 'zustand/react/shallow'
import { useYTDLiveChatStore } from '@/shared/stores'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'

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
      superChatBarDisplay: state.superChatBarDisplay,
    }
    addPresetItem(uuidv4(), t('content.preset.addItemTitle'), ylcStyle)
  }, [addPresetItem, t])
  return (
    <div className='mx-3 my-3.5'>
      <button
        type='button'
        className={classNames(
          'border border-solid ylc-theme-border px-2.5 py-3 rounded-[12px] transition-colors duration-200 flex justify-center items-center cursor-pointer w-full',
          addPresetEnabled
            ? 'ylc-theme-surface ylc-theme-text-primary'
            : 'ylc-theme-elevated opacity-[0.35] cursor-not-allowed ylc-theme-text-secondary',
        )}
        onClick={() => addPresetEnabled && addItem()}
        disabled={!addPresetEnabled}
      >
        <span className='ylc-theme-icon-badge ylc-theme-icon-badge-xs mr-2'>
          <TbPlus size={16} />
        </span>
        <div>{t('content.preset.addMessage')}</div>
      </button>
    </div>
  )
}
