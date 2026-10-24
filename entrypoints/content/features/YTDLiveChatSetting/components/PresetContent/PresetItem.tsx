import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { TbCheck, TbGripVertical, TbTrash } from '@/shared/components/icons'
import { Modal } from '@/shared/components/Modal'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { formatMessage } from '@/shared/i18n/format'
import type { TranslationKey } from '@/shared/i18n/generated/translationTypes'
import { useT } from '@/shared/i18n/react'
import { BUILTIN_PRESETS } from '@/shared/settings/builtinPresets'
import { areChatProfilesEqual } from '@/shared/settings/equality'
import type { ChatProfile } from '@/shared/settings/model'
import { MAX_PRESET_NAME_LENGTH } from '@/shared/settings/persistConfig'
import { deletePresetAtom, effectiveProfileAtom, presetsAtom, updatePresetNameAtom } from '@/shared/state'
import { useStyleHistoryCommands } from '../../styleHistoryCommands'
import { getModalParentElement } from '../../utils/getModalParentElement'
import { getPresetDisplayTitle } from './presetDisplayTitle'

interface PresetItemType {
  id: string
  pointerDragging?: boolean
  focusName?: boolean
  onNameFocused?: () => void
  reorder: {
    activeId: string | null
    getHandleProps: (id: string) => {
      'aria-pressed'?: boolean
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
      onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
    }
  }
}

const DELETE_MODAL_OVERLAY_STYLE = {
  zIndex: CONTENT_UI_LAYER.nestedModal,
} as const

const getFirstFocusableControl = (element: HTMLElement | undefined) =>
  element?.querySelector<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ) ?? null

export const PresetItem = ({ id, reorder, focusName = false, onNameFocused, pointerDragging = false }: PresetItemType) => {
  const preset = useAtomValue(presetsAtom).find(entry => entry.id === id)
  const updatePresetName = useSetAtom(updatePresetNameAtom)
  const deletePreset = useSetAtom(deletePresetAtom)
  const { commitYLCProfile } = useStyleHistoryCommands()
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const deleteDialogTitleId = useId()
  const deleteNameId = useId()
  const deleteQuestionId = useId()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const currentProfile = useAtomValue(effectiveProfileAtom)
  const itemRef = useRef<HTMLDivElement>(null)
  const t = useT()
  const isBuiltIn = preset?.kind === 'builtin'
  const displayTitle = getPresetDisplayTitle(preset, t)
  const [nameDraft, setNameDraft] = useState(displayTitle)
  const nameDraftRef = useRef(displayTitle)
  const nameAtFocusRef = useRef(displayTitle)
  const editingNameRef = useRef(false)
  // Every row carries the same three controls, so the name is what tells them apart when read aloud.
  // A custom preset whose name the user cleared falls back to the label new presets are born with.
  const rowLabel = (key: TranslationKey) => formatMessage(t(key), { name: displayTitle || t('content.preset.addItemTitle') })
  const profile = preset?.kind === 'builtin' ? BUILTIN_PRESETS[preset.id].profile : preset?.profile
  const canApply = profile !== undefined
  const isCurrent = profile !== undefined && areChatProfilesEqual(profile, currentProfile)
  useLayoutEffect(() => {
    const input = nameInputRef.current
    if (!focusName || !input || isBuiltIn) return
    input.focus({ preventScroll: true })
    input.select()
    input.scrollIntoView?.({ block: 'nearest' })
    onNameFocused?.()
  }, [focusName, isBuiltIn, onNameFocused])
  const isDragging = reorder.activeId === id

  useEffect(() => {
    if (editingNameRef.current) return
    nameDraftRef.current = displayTitle
    setNameDraft(displayTitle)
  }, [displayTitle])

  const updateStyle = useCallback((nextProfile: ChatProfile) => {
    commitYLCProfile(nextProfile)
  }, [])
  const commitName = useCallback(() => {
    if (!isBuiltIn) updatePresetName({ id, name: nameDraftRef.current })
  }, [id, isBuiltIn, updatePresetName])

  const deleteAndRestoreFocus = useCallback(() => {
    const item = itemRef.current
    const list = item?.parentElement
    const items = list ? [...list.querySelectorAll<HTMLElement>('[data-ylc-preset-item]')] : []
    const index = item ? items.indexOf(item) : -1
    const adjacentItem = index >= 0 ? (items[index + 1] ?? items[index - 1]) : undefined
    const focusTarget =
      getFirstFocusableControl(adjacentItem) ?? list?.querySelector<HTMLElement>('[data-ylc-add-preset]:not([disabled])') ?? null

    if (!deletePreset(id)) return
    // The ordered list can remove this row after its own synchronization effect.
    // Release the modal's inert background before the next-frame focus request.
    setIsDeleteModalOpen(false)
    requestAnimationFrame(() => {
      if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true })
    })
  }, [deletePreset, id])

  return (
    <div
      ref={itemRef}
      className={`ylc-preset ${isDragging ? 'ylc-theme-raised cursor-grabbing ylc-theme-shadow-sm' : ''}`}
      data-ylc-preset-item={id}
      data-ylc-preset-current={isCurrent ? 'true' : undefined}
      data-ylc-preset-dragging={pointerDragging ? 'true' : undefined}
    >
      <button
        type='button'
        className={`ylc-preset-grip ${isDragging ? 'cursor-grabbing' : ''}`}
        {...reorder.getHandleProps(id)}
        aria-label={rowLabel('content.aria.reorderPreset')}
      >
        <TbGripVertical size={20} aria-hidden='true' />
      </button>
      <input
        ref={nameInputRef}
        type='text'
        value={isBuiltIn ? displayTitle : nameDraft}
        onFocus={() => {
          editingNameRef.current = true
          nameAtFocusRef.current = displayTitle
        }}
        onChange={event => {
          nameDraftRef.current = event.target.value
          setNameDraft(event.target.value)
        }}
        onBlur={() => {
          editingNameRef.current = false
          if (nameDraftRef.current === nameAtFocusRef.current) {
            // Merely focusing the field must not overwrite an external rename.
            nameDraftRef.current = displayTitle
            setNameDraft(displayTitle)
          } else {
            commitName()
          }
        }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing || isBuiltIn) return
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            nameDraftRef.current = displayTitle
            setNameDraft(displayTitle)
            event.currentTarget.blur()
          }
        }}
        maxLength={MAX_PRESET_NAME_LENGTH}
        readOnly={isBuiltIn}
        aria-label={t('content.aria.presetName')}
        className='ylc-preset-name'
      />
      <div data-ylc-preset-actions className='ylc-preset-actions'>
        <button
          type='button'
          disabled={!canApply}
          aria-pressed={isCurrent}
          className='ylc-preset-apply'
          aria-label={rowLabel('content.aria.applyPreset')}
          onClick={() => {
            if (!profile || isCurrent) return
            updateStyle(profile)
          }}
        >
          {isCurrent ? <TbCheck size={16} aria-hidden='true' /> : null}
          <span>{t(isCurrent ? 'content.preset.current' : 'content.preset.apply')}</span>
        </button>
        <button
          type='button'
          className='ylc-preset-del'
          aria-label={rowLabel('content.aria.deletePreset')}
          onClick={() => setIsDeleteModalOpen(true)}
        >
          <TbTrash size={18} aria-hidden='true' />
        </button>
      </div>
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          ariaLabelledBy={deleteDialogTitleId}
          ariaDescribedBy={`${deleteNameId} ${deleteQuestionId}`}
          onRequestClose={() => setIsDeleteModalOpen(false)}
          shouldReturnFocusAfterClose={true}
          overlayClassName='fixed top-0 left-0 w-full h-full bg-black/35'
          overlayStyle={DELETE_MODAL_OVERLAY_STYLE}
          contentClassName='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,380px)] max-h-[calc(100dvh-24px)] box-border flex min-h-0 flex-col ylc-theme-surface rounded-xl ylc-theme-shadow-md outline-none overflow-hidden ylc-theme-dialog-border'
          parentSelector={getModalParentElement}
        >
          <div className='shrink-0 px-5 pt-5 pb-3'>
            <h3 id={deleteDialogTitleId} className='m-0 text-base leading-6 font-semibold ylc-theme-text-primary'>
              {t('content.preset.delete')}
            </h3>
          </div>
          <section
            aria-labelledby={deleteDialogTitleId}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: scroll regions need keyboard scrolling inside the modal focus trap
            tabIndex={0}
            className='min-h-0 overflow-y-auto px-5 pb-1 ylc-theme-focus-ring-soft'
            style={{ overscrollBehavior: 'contain' }}
          >
            <p id={deleteNameId} className='ylc-preset-delete-name'>
              <bdi>{displayTitle || t('content.preset.addItemTitle')}</bdi>
            </p>
            <p id={deleteQuestionId} className='m-0 text-sm leading-6 ylc-theme-text-secondary'>
              {t('content.preset.deleteConfirmationMessage')}
            </p>
          </section>
          <div className='shrink-0 px-5 py-4 flex flex-wrap justify-end items-center gap-2'>
            <button
              type='button'
              onClick={() => setIsDeleteModalOpen(false)}
              className='rounded-md leading-none font-medium cursor-pointer transition-colors border-none bg-transparent ylc-theme-focus-ring-soft ylc-theme-text-primary hover:bg-[var(--ylc-hover-surface)] ylc-dialog-btn'
            >
              {t('content.preset.cancel')}
            </button>
            <button
              type='button'
              onClick={deleteAndRestoreFocus}
              className='rounded-md leading-none font-semibold cursor-pointer border-none ylc-theme-focus-ring-soft ylc-dialog-btn-primary ylc-dialog-btn-danger'
            >
              {t('content.preset.delete')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
