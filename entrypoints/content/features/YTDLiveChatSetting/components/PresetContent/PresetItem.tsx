import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { changeYLCStyle, resolveYLCMembershipNameColor } from '@/entrypoints/content/hooks/ylcStyleChange/ylcStyleApplier'
import { TbCheck, TbGripVertical, TbTrash } from '@/shared/components/icons'
import { Modal } from '@/shared/components/Modal'
import { useYTDLiveChatStore } from '@/shared/stores'
import { getPresetTitleFallbackKey } from '@/shared/stores/ytdLiveChatStore'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'
import { getModalParentElement } from '../../utils/getModalParentElement'

interface PresetItemType {
  id: string
}

export const PresetItem = ({ id }: PresetItemType) => {
  const { title, ylcStyle, updateTitle, updateYLCStyle, deletePresetItem, setAddPresetEnabled } = useYTDLiveChatStore(
    useShallow(state => ({
      title: state.presetItemTitles[id],
      ylcStyle: state.presetItemStyles[id],
      updateTitle: state.updateTitle,
      deletePresetItem: state.deletePresetItem,
      updateYLCStyle: state.updateYLCStyle,
      setAddPresetEnabled: state.setAddPresetEnabled,
    })),
  )
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const { t } = useTranslation()
  const titleFallbackKey = getPresetTitleFallbackKey(id)
  const displayTitle = typeof title === 'string' && title.trim().length > 0 ? title : titleFallbackKey ? t(titleFallbackKey) : ''
  const { attributes, setActivatorNodeRef, listeners, setNodeRef, transform, isDragging, transition } = useSortable({
    id: id,
  })
  const updateStyle = useCallback(
    (ylcStyle: YLCStyleType) => {
      const resolvedStyle = {
        ...ylcStyle,
        membershipNameColor: resolveYLCMembershipNameColor(ylcStyle.membershipNameColor),
      }
      updateYLCStyle(resolvedStyle)
      changeYLCStyle(resolvedStyle)
      setAddPresetEnabled(false)
    },
    [setAddPresetEnabled, updateYLCStyle],
  )

  return (
    <div
      className={`ylc-preset ${isDragging ? 'z-1 cursor-grabbing ylc-theme-shadow-sm' : ''}`}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button
        type='button'
        ref={setActivatorNodeRef}
        className={`ylc-preset-grip ${isDragging ? 'cursor-grabbing' : ''}`}
        {...listeners}
        {...attributes}
        aria-label={t('content.aria.reorderPreset')}
      >
        <TbGripVertical size={20} aria-hidden='true' />
      </button>
      <input
        type='text'
        value={displayTitle}
        onChange={event => updateTitle(id, event.target.value)}
        aria-label={t('content.aria.presetName')}
        className='ylc-preset-name'
      />
      <div data-ylc-preset-actions className='ylc-preset-actions'>
        <button type='button' className='ylc-preset-apply' aria-label={t('content.aria.applyPreset')} onClick={() => updateStyle(ylcStyle)}>
          <TbCheck size={16} aria-hidden='true' />
          <span>{t('content.preset.apply')}</span>
        </button>
        <button
          type='button'
          className='ylc-preset-del'
          aria-label={t('content.aria.deletePreset')}
          onClick={() => setIsDeleteModalOpen(true)}
        >
          <TbTrash size={18} aria-hidden='true' />
        </button>
      </div>
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onRequestClose={() => setIsDeleteModalOpen(false)}
          shouldReturnFocusAfterClose={true}
          overlayClassName='fixed top-0 left-0 w-full h-full bg-black/35 z-[1000001]'
          contentClassName='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,380px)] ylc-theme-surface rounded-xl ylc-theme-shadow-md outline-none overflow-hidden ylc-theme-dialog-border'
          parentSelector={getModalParentElement}
        >
          <div className='px-5 py-4 ylc-theme-dialog-divider-bottom'>
            <h3 className='m-0 text-base leading-6 font-semibold ylc-theme-text-primary'>{t('content.preset.delete')}</h3>
          </div>
          <div className='px-5 py-4'>
            <p className='m-0 text-sm leading-6 ylc-theme-text-secondary'>{t('content.preset.deleteConfirmationMessage')}</p>
          </div>
          <div className='px-5 py-3 flex justify-end items-center gap-2 ylc-theme-dialog-divider-top'>
            <button
              type='button'
              onClick={() => setIsDeleteModalOpen(false)}
              className='rounded-md leading-none font-medium cursor-pointer transition-colors border-none bg-transparent ylc-theme-focus-ring-soft ylc-theme-text-primary hover:bg-[var(--ylc-hover-surface)] ylc-dialog-btn'
            >
              {t('content.preset.cancel')}
            </button>
            <button
              type='button'
              onClick={() => deletePresetItem(id)}
              className='rounded-md leading-none font-semibold cursor-pointer transition-opacity border-none ylc-theme-focus-ring-soft bg-[var(--ylc-danger-border)] text-white hover:opacity-90 ylc-dialog-btn-primary'
            >
              {t('content.preset.delete')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
