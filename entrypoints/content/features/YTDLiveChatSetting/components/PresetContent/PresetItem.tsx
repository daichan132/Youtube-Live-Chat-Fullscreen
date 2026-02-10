import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type ComponentType, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbGripVertical, TbSparkles, TbTrash } from 'react-icons/tb'
import Modal from 'react-modal'
import { useShallow } from 'zustand/react/shallow'
import { useChangeYLCStyle } from '@/entrypoints/content/hooks/ylcStyleChange/useChangeYLCStyle'
import { useYTDLiveChatStore } from '@/shared/stores'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'
import { getModalParentElement } from '../../utils/getModalParentElement'

const ModalSafeForReact19 = Modal as ComponentType<ReactModal['props']>

interface PresetItemType {
  id: string
}

export const PresetItem = ({ id }: PresetItemType) => {
  const actionIconClassName =
    'p-1.5 rounded-md mx-0.5 cursor-pointer transition-colors duration-200 ylc-theme-elevated ylc-theme-text-secondary hover:text-[var(--ylc-text-primary)] hover:bg-[var(--ylc-hover-surface)]'
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
  const { attributes, setActivatorNodeRef, listeners, setNodeRef, transform, isDragging, transition } = useSortable({
    id: id,
  })
  const changeYLCStyle = useChangeYLCStyle()
  const updateStyle = useCallback(
    (ylcStyle: YLCStyleType) => {
      updateYLCStyle(ylcStyle)
      changeYLCStyle(ylcStyle)
      setAddPresetEnabled(false)
    },
    [changeYLCStyle, setAddPresetEnabled, updateYLCStyle],
  )
  const { t } = useTranslation()

  return (
    <div
      className={`ylc-preset-card ylc-theme-surface m-3 p-3 rounded-[12px] border border-solid ylc-theme-border relative transition-shadow duration-200 ${
        isDragging ? 'z-1 cursor-grabbing ylc-theme-shadow-sm' : ''
      }`}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className='flex justify-between items-center gap-2'>
        <div className='group flex items-center min-w-0 flex-1'>
          <div ref={setActivatorNodeRef} className='flex items-center justify-center'>
            <TbGripVertical
              className={`transition-all duration-200 outline-none rounded-md ylc-theme-elevated ylc-theme-text-secondary hover:text-[var(--ylc-text-primary)] hover:bg-[var(--ylc-hover-surface)] ${
                isDragging
                  ? 'w-[20px] h-[20px] p-[2px] opacity-100 cursor-grabbing'
                  : 'w-[20px] h-[20px] p-[2px] opacity-0 group-hover:opacity-100 cursor-grab'
              }`}
              size={18}
              {...listeners}
              {...attributes}
            />
          </div>
          <input
            type='text'
            value={title}
            onChange={event => updateTitle(id, event.target.value)}
            className='ml-1 h-8 px-1.5 rounded-[8px] outline-none min-w-0 flex-1 max-w-[240px] text-sm font-medium tracking-[0.01em] ylc-theme-input-borderless'
          />
        </div>
        <div className='flex transition-opacity duration-200 shrink-0'>
          <TbSparkles className={actionIconClassName} size={18} onClick={() => updateStyle(ylcStyle)} />
          <TbTrash className={actionIconClassName} size={18} onClick={() => setIsDeleteModalOpen(true)} />
        </div>
      </div>
      {isDeleteModalOpen && (
        <ModalSafeForReact19
          isOpen={isDeleteModalOpen}
          className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,380px)] ylc-theme-surface rounded-xl ylc-theme-shadow-md outline-none overflow-hidden ylc-theme-dialog-border'
          onRequestClose={() => setIsDeleteModalOpen(false)}
          overlayClassName='fixed top-0 left-0 w-full h-full bg-black/35 z-[1000001]'
          appElement={document.body}
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
              className='h-9 px-3 rounded-md text-sm leading-none font-medium cursor-pointer transition-colors border-none bg-transparent ylc-theme-focus-ring-soft ylc-theme-text-primary hover:bg-[var(--ylc-hover-surface)]'
            >
              {t('content.preset.cancel')}
            </button>
            <button
              type='button'
              onClick={() => deletePresetItem(id)}
              className='h-9 px-4 rounded-md text-sm leading-none font-semibold cursor-pointer transition-opacity border-none ylc-theme-focus-ring-soft bg-[var(--ylc-danger-border)] text-white hover:opacity-90'
            >
              {t('content.preset.delete')}
            </button>
          </div>
        </ModalSafeForReact19>
      )}
    </div>
  )
}
