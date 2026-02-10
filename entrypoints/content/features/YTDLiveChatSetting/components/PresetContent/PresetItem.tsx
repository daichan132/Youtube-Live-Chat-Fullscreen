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
      className={`ylc-theme-surface m-3 p-2 rounded-[12px] border border-solid ylc-theme-border relative transition-shadow duration-200 ${
        isDragging ? 'z-1 cursor-grabbing ylc-theme-shadow-sm' : ''
      }`}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className='flex justify-between items-center gap-2'>
        <div className='group flex items-center min-w-0 flex-1'>
          <div ref={setActivatorNodeRef}>
            <TbGripVertical
              className={`transition-all duration-200 outline-none rounded-md ylc-theme-elevated ylc-theme-text-secondary hover:text-[var(--ylc-text-primary)] hover:bg-[var(--ylc-hover-surface)] ${
                isDragging
                  ? 'w-5 h-5 p-0.5 opacity-100 cursor-grabbing'
                  : 'w-0 h-0 p-0 group-hover:w-5 group-hover:h-5 group-hover:p-0.5 opacity-0 group-hover:opacity-100 cursor-grab'
              }`}
              size={14}
              {...listeners}
              {...attributes}
            />
          </div>
          <input
            type='text'
            value={title}
            onChange={event => updateTitle(id, event.target.value)}
            className='ml-1 h-7 px-1.5 rounded-[10px] outline-none min-w-0 flex-1 max-w-[15rem] text-sm font-medium tracking-[0.01em] ylc-theme-input-borderless'
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
          className='fixed top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 max-w-[320px] ylc-theme-surface p-6 rounded-[12px] ylc-theme-shadow-md outline-none text-center border ylc-theme-border'
          onRequestClose={() => setIsDeleteModalOpen(false)}
          overlayClassName='fixed top-0 left-0 w-full h-full bg-black/50 z-[1000001]'
          appElement={document.body}
          parentSelector={getModalParentElement}
        >
          <div className='mb-4 text-[1.5rem] font-bold ylc-theme-text-primary'>
            <p>{t('content.preset.deleteConfirmationMessage')}</p>
          </div>
          <div className='flex justify-around mt-6 space-x-4'>
            <button
              type='button'
              onClick={() => deletePresetItem(id)}
              className='w-[150px] ylc-theme-danger rounded-[10px] p-3 cursor-pointer font-bold transition-colors ylc-theme-focus-ring-soft'
            >
              {t('content.preset.delete')}
            </button>
            <button
              type='button'
              onClick={() => setIsDeleteModalOpen(false)}
              className='w-[150px] ylc-theme-surface border ylc-theme-border rounded-[10px] p-3 cursor-pointer transition-colors ylc-theme-focus-ring-soft hover:bg-[var(--ylc-bg-surface-elevated)]'
            >
              {t('content.preset.cancel')}
            </button>
          </div>
        </ModalSafeForReact19>
      )}
    </div>
  )
}
