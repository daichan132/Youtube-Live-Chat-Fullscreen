import { atom } from 'jotai'
import { DEFAULT_CUSTOM_CSS, type ChatCssCustomization, type CustomCssErrorCode, type SavedChatCss } from '@/shared/settings/customCss'
import type { ChatSettings } from '@/shared/settings/model'
import { getAppearanceCapacityError, type SettingsCapacityErrorCode } from '@/shared/settings/settingsCapacity'

export const customCssAtom = atom<ChatCssCustomization>({ ...DEFAULT_CUSTOM_CSS })
export const savedChatCssAtom = atom<SavedChatCss[]>([])
// Fail closed until hydration. Neither stop flag belongs to style history.
export const customCssSuspendedAtom = atom(true)
// A failed stop write must not be undone by an older resume readback in this
// context. Only confirmation of a stop or explicit resume clears this latch.
export const customCssLocalStopAtom = atom(false)
export const isCustomCssStoppedAtom = atom(get => get(customCssSuspendedAtom) || get(customCssLocalStopAtom))
export const appliedChatCssAtom = atom(get => {
  const value = get(customCssAtom)
  return !get(isCustomCssStoppedAtom) && value.enabled ? value.css : ''
})

// Page-local editing state survives switching between existing settings tabs.
// None of it is saved automatically or included in a backup.
export type CustomCssDraft = { css: string; baseline: ChatCssCustomization }
export type CustomCssOperation = 'apply' | 'disable' | 'register' | 'remove'
export const customCssOperationAtom = atom<CustomCssOperation | null>(null)
export const customCssDraftAtom = atom<CustomCssDraft | null>(null)
export type CustomCssSource = { kind: 'preset' | 'saved'; id: string } | null
export type CustomCssEditorUi = {
  name: string
  registering: boolean
  source: CustomCssSource
  expanded: boolean
}
export const customCssEditorUiAtom = atom<CustomCssEditorUi>({ name: '', registering: false, source: null, expanded: false })
export const customCssFeedbackAtom = atom<
  { kind: 'success'; operation: CustomCssOperation } | { kind: 'error'; operation: CustomCssOperation; code: CustomCssErrorCode | 'storage' } | null
>(null)
export const customCssRecoveryAtom = atom({ pending: false, target: true, failed: false })

// A successful repository retry does not re-enter the original action Promise.
// Reconcile a failed request only when the confirmed value matches its intent.
// In particular, an old resume must never clear a failed, newer stop request.
export const receiveCustomCssSuspendedAtom = atom(null, (get, set, value: boolean) => {
  set(customCssSuspendedAtom, value)
  const recovery = get(customCssRecoveryAtom)
  if (!recovery.pending && recovery.failed && recovery.target === value) {
    set(customCssLocalStopAtom, false)
    set(customCssRecoveryAtom, { pending: false, target: value, failed: false })
  }
})
export const hasUnappliedCustomCssAtom = atom(get => {
  const draft = get(customCssDraftAtom)
  const editor = get(customCssEditorUiAtom)
  return (draft !== null && draft.css !== get(customCssAtom).css) || editor.name.trim().length > 0
})

export const appearanceCapacityErrorAtom = atom<SettingsCapacityErrorCode | null>(null)
export const validateAppearanceCapacityAtom = atom(null, (_get, set, next: Pick<ChatSettings, 'profile' | 'presets'>) => {
  const error = getAppearanceCapacityError(next)
  set(appearanceCapacityErrorAtom, error)
  return error === null
})
