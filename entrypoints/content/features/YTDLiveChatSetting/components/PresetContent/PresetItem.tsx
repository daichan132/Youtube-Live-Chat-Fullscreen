import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useId, useState } from 'react'
import { TbCheck, TbGripVertical, TbTrash } from '@/shared/components/icons'
import { Modal } from '@/shared/components/Modal'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { formatMessage } from '@/shared/i18n/format'
import { useT } from '@/shared/i18n/react'
import { BUILTIN_PRESETS } from '@/shared/settings/builtinPresets'
import type { ChatProfile } from '@/shared/settings/model'
import { deletePresetAtom, presetsAtom, updatePresetNameAtom } from '@/shared/state'
import { useStyleHistoryCommands } from '../../styleHistoryCommands'
import { getModalParentElement } from '../../utils/getModalParentElement'
import { getPresetDisplayTitle } from './presetDisplayTitle'

interface PresetItemType {
  id: string
  reorder: {
    activeId: string | null
    getHandleProps: (id: string) => {
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
      onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
    }
  }
}

const DELETE_MODAL_OVERLAY_STYLE = {
  zIndex: CONTENT_UI_LAYER.nestedModal,
} as const

export const PresetItem = ({ id, reorder }: PresetItemType) => {
  const preset = useAtomValue(presetsAtom).find(entry => entry.id === id)
  const updatePresetName = useSetAtom(updatePresetNameAtom)
  const deletePreset = useSetAtom(deletePresetAtom)
  const { commitYLCProfile } = useStyleHistoryCommands()
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const deleteDialogTitleId = useId()
  const t = useT()
  const isBuiltIn = preset?.kind === 'builtin'
  const displayTitle = getPresetDisplayTitle(preset, t)
  // Every row carries the same three controls, so the name is what tells them apart when read aloud.
  // A custom preset whose name the user cleared falls back to the label new presets are born with.
  const rowLabel = (key: string) => formatMessage(t(key), { name: displayTitle || t('content.preset.addItemTitle') })
  const profile = preset?.kind === 'builtin' ? BUILTIN_PRESETS[preset.id].profile : preset?.profile
  const canApply = profile !== undefined
  const isDragging = reorder.activeId === id
  const updateStyle = useCallback((nextProfile: ChatProfile) => {
    commitYLCProfile(nextProfile, 'preset')
  }, [])

  return (
    <div className={`ylc-preset ${isDragging ? 'ylc-theme-raised cursor-grabbing ylc-theme-shadow-sm' : ''}`} data-ylc-preset-item={id}>
      <button
        type='button'
        className={`ylc-preset-grip ${isDragging ? 'cursor-grabbing' : ''}`}
        {...reorder.getHandleProps(id)}
        aria-label={rowLabel('content.aria.reorderPreset')}
      >
        <TbGripVertical size={20} aria-hidden='true' />
      </button>
      <input
        type='text'
        value={displayTitle}
        onChange={event => updatePresetName({ id, name: event.target.value })}
        readOnly={isBuiltIn}
        aria-label={t('content.aria.presetName')}
        className='ylc-preset-name'
      />
      <div data-ylc-preset-actions className='ylc-preset-actions'>
        <button
          type='button'
          disabled={!canApply}
          className='ylc-preset-apply'
          aria-label={rowLabel('content.aria.applyPreset')}
          onClick={() => {
            if (!profile) return
            updateStyle(profile)
          }}
        >
          <TbCheck size={16} aria-hidden='true' />
          <span>{t('content.preset.apply')}</span>
        </button>
        {!isBuiltIn && (
          <button
            type='button'
            className='ylc-preset-del'
            aria-label={rowLabel('content.aria.deletePreset')}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <TbTrash size={18} aria-hidden='true' />
          </button>
        )}
      </div>
      {!isBuiltIn && isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          ariaLabelledBy={deleteDialogTitleId}
          onRequestClose={() => setIsDeleteModalOpen(false)}
          shouldReturnFocusAfterClose={true}
          overlayClassName='fixed top-0 left-0 w-full h-full bg-black/35'
          overlayStyle={DELETE_MODAL_OVERLAY_STYLE}
          contentClassName='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,380px)] ylc-theme-surface rounded-xl ylc-theme-shadow-md outline-none overflow-hidden ylc-theme-dialog-border'
          parentSelector={getModalParentElement}
        >
          <div className='px-5 py-4 ylc-theme-dialog-divider-bottom'>
            <h3 id={deleteDialogTitleId} className='m-0 text-base leading-6 font-semibold ylc-theme-text-primary'>
              {t('content.preset.delete')}
            </h3>
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
              onClick={() => deletePreset(id)}
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
