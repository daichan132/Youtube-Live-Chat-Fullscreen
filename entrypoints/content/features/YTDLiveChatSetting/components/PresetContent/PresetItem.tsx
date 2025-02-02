import { useChangeYLCStyle } from '@/entrypoints/content/hooks/ylcStyleChange/useChangeYLCStyle'
import { useYTDLiveChatStore } from '@/shared/stores'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type ComponentType, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoTrashOutline } from 'react-icons/io5'
import { MdAutoFixNormal, MdOutlineDragIndicator } from 'react-icons/md'
import Modal from 'react-modal'
import { useShallow } from 'zustand/react/shallow'

const ModalSafeForReact19 = Modal as ComponentType<ReactModal['props']>

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
      className={`bg-white m-4 p-4 rounded-lg border border-solid border-black/10 relative ${isDragging ? 'z-1 cursor-grabbing' : ''}`}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className='flex justify-between items-center'>
        <div className='group flex items-center'>
          <div ref={setActivatorNodeRef}>
            <MdOutlineDragIndicator
              className={`transition-all duration-200 outline-0 rounded focus:ring-1 focus:ring-black/10 mt-1 ${
                isDragging
                  ? 'w-7 px-1 opacity-100 cursor-grabbing bg-black/10'
                  : 'w-0 group-hover:w-7 p-0 group-hover:px-1 opacity-0 group-hover:opacity-100 cursor-grab'
              }`}
              size={24}
              {...listeners}
              {...attributes}
            />
          </div>
          <input
            type='text'
            value={title}
            onChange={event => updateTitle(id, event.target.value)}
            className='ml-1 tracking-widest border-none p-2 rounded w-60 outline-0 focus:ring-1 focus:ring-black/10'
          />
        </div>
        <div className='flex transition-opacity duration-200'>
          <MdAutoFixNormal className='p-2 rounded hover:bg-black/10 mx-1 cursor-pointer' size={20} onClick={() => updateStyle(ylcStyle)} />
          <IoTrashOutline
            className='p-2 rounded hover:bg-black/10 mx-1 cursor-pointer'
            size={20}
            onClick={() => setIsDeleteModalOpen(true)}
          />
        </div>
      </div>
      {isDeleteModalOpen && (
        <ModalSafeForReact19
          isOpen={isDeleteModalOpen}
          className='fixed top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 max-w-[320px] bg-white p-6 rounded-lg shadow-lg outline-none text-center border border-black/10'
          onRequestClose={() => setIsDeleteModalOpen(false)}
          overlayClassName='fixed top-0 left-0 w-full h-full bg-black/50 z-[1000001]'
          appElement={document.body}
          parentSelector={() => (document.getElementById('shadow-root-live-chat')?.shadowRoot as unknown as HTMLElement) || document.body}
        >
          <div className='mb-4 text-[1.5rem] font-bold text-[#333]'>
            <p>{t('content.preset.deleteConfirmationMessage')}</p>
          </div>
          <div className='flex justify-around mt-6 space-x-4'>
            <button
              type='button'
              onClick={() => deletePresetItem(id)}
              className='w-[150px] bg-white text-[#f21616] border border-[#f21616] rounded-lg p-3 cursor-pointer font-bold transition-colors hover:bg-[#ffe9e9]'
            >
              {t('content.preset.delete')}
            </button>
            <button
              type='button'
              onClick={() => setIsDeleteModalOpen(false)}
              className='w-[150px] bg-white border border-black rounded-lg p-3 cursor-pointer transition-colors hover:bg-black/10'
            >
              {t('content.preset.cancel')}
            </button>
          </div>
        </ModalSafeForReact19>
      )}
    </div>
  )
}
