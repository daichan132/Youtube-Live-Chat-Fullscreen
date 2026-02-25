import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { TbPlus } from '@/shared/components/icons'
import { useYTDLiveChatStore } from '@/shared/stores'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'
import { cn } from '@/shared/utils/cn'

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
    addPresetItem(crypto.randomUUID(), t('content.preset.addItemTitle'), ylcStyle)
  }, [addPresetItem, t])
  return (
    <div className='mx-3 my-3.5'>
      <button
        type='button'
        className={cn(
          'ylc-add-preset-button border border-solid ylc-theme-border px-2.5 py-3 rounded-[12px] transition-colors duration-160 flex justify-center items-center cursor-pointer w-full ylc-theme-focus-ring-soft',
          addPresetEnabled
            ? 'ylc-theme-surface ylc-theme-text-primary hover:bg-[var(--ylc-hover-surface)]'
            : 'ylc-theme-elevated opacity-[0.35] cursor-not-allowed ylc-theme-text-secondary',
        )}
        onClick={() => addPresetEnabled && addItem()}
        disabled={!addPresetEnabled}
      >
        <span className='ylc-theme-icon-badge ylc-theme-icon-badge-xs ylc-add-preset-icon mr-2'>
          <TbPlus size={16} aria-hidden='true' />
        </span>
        <div>{t('content.preset.addMessage')}</div>
      </button>
    </div>
  )
}
