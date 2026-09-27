import { useAtom, useAtomValue, useStore } from 'jotai'
import { type MouseEvent, useEffect, useId, useRef, useState } from 'react'
import { TbPalette } from '@/shared/components/icons'
import type { TranslationKey } from '@/shared/i18n/generated/translationTypes'
import { useT } from '@/shared/i18n/react'
import { useOptionalAppRuntime } from '@/shared/runtime/AppProvider'
import { CHAT_CSS_PRESETS } from '@/shared/settings/chatCssPresets'
import {
  areCustomCssEqual,
  assertCustomCss,
  type ChatCssCustomization,
  type CustomCssErrorCode,
  MAX_CSS_NAME_LENGTH,
  MAX_CUSTOM_CSS_BYTES,
  MAX_SAVED_CHAT_CSS,
  type SavedChatCss,
  utf8Bytes,
} from '@/shared/settings/customCss'
import { persistenceStatusAtom } from '@/shared/state/atoms'
import {
  type CustomCssSource,
  customCssAtom,
  customCssDraftAtom,
  customCssEditorUiAtom,
  customCssFeedbackAtom,
  customCssOperationAtom,
  customCssRecoveryAtom,
  customCssSuspendedAtom,
  isCustomCssStoppedAtom,
  savedChatCssAtom,
} from '@/shared/state/customCssAtoms'
import { ChatCssExample } from './ChatCssExample'
import './customCssSection.css'

type Confirmation =
  | { kind: 'load'; css: string; source: CustomCssSource }
  | { kind: 'delete'; entry: SavedChatCss }
  | { kind: 'overwrite'; expected: ChatCssCustomization }

const ERROR_KEYS: Record<CustomCssErrorCode | 'storage', TranslationKey> = {
  invalid: 'content.customCss.invalid',
  'too-large': 'content.customCss.tooLarge',
  'library-full': 'content.customCss.libraryFull',
  'library-too-large': 'content.customCss.libraryTooLarge',
  'duplicate-name': 'content.customCss.duplicateName',
  conflict: 'content.customCss.conflict',
  unconfirmed: 'content.customCss.saveFailed',
  storage: 'content.customCss.saveFailed',
  busy: 'content.customCss.busy',
}
const SUCCESS_KEYS = {
  apply: 'content.customCss.applied',
  register: 'content.customCss.registered',
  remove: 'content.customCss.deleted',
  disable: 'content.customCss.disabled',
} as const satisfies Record<string, TranslationKey>

export const CustomCssSection = () => {
  const t = useT()
  const runtime = useOptionalAppRuntime()
  const store = useStore()
  const active = useAtomValue(customCssAtom)
  const saved = useAtomValue(savedChatCssAtom)
  const stopped = useAtomValue(isCustomCssStoppedAtom)
  const confirmedStopped = useAtomValue(customCssSuspendedAtom)
  const operation = useAtomValue(customCssOperationAtom)
  const recovery = useAtomValue(customCssRecoveryAtom)
  const feedback = useAtomValue(customCssFeedbackAtom)
  const persistence = useAtomValue(persistenceStatusAtom)
  const [draft, setDraft] = useAtom(customCssDraftAtom)
  const [editorUi, setEditorUi] = useAtom(customCssEditorUiAtom)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const chooserRef = useRef<HTMLSelectElement>(null)
  const editRef = useRef<HTMLButtonElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const applyButtonRef = useRef<HTMLButtonElement>(null)
  const stopTrigger = useRef<HTMLButtonElement | null>(null)
  const restoreRegistrationFocus = useRef<HTMLElement | null>(null)
  const previousEditing = useRef(editorUi.expanded)
  const id = useId()
  // A first-run suggestion is not a draft, a saved value or an enabled style.
  const css = draft?.css ?? (active.css || CHAT_CSS_PRESETS[0]?.css || '')
  const changed = css !== active.css
  const source = editorUi.source
  const selected = source?.kind === 'saved' ? saved.find(entry => entry.id === source.id) : undefined
  const originalPreset = source?.kind === 'preset' ? CHAT_CSS_PRESETS.find(entry => entry.id === source.id) : undefined
  const example = CHAT_CSS_PRESETS.find(entry => entry.css === css)
  const choice = selected?.css === css ? `saved:${selected.id}` : example ? `preset:${example.id}`
    : active.css && css === active.css ? 'current' : 'draft'
  const bytes = utf8Bytes(css)
  const tooLarge = (() => {
    try {
      assertCustomCss({ enabled: true, css })
      return false
    } catch {
      return true
    }
  })()
  const hasFailedCssSave = persistence.status === 'error' && persistence.failedDomains.includes('customCss')
  const busy = operation !== null || recovery.pending
  const conflict = draft !== null && !areCustomCssEqual(draft.baseline, active)
  const inUse = active.enabled && !stopped
  const matched = inUse && !changed && !hasFailedCssSave && !recovery.failed
  const canApply = runtime !== null && !busy && !tooLarge && !!css.trim() && !matched
  const name = editorUi.name.trim()
  const duplicateName = !!name && saved.some(entry => entry.name.trim() === name)
  const registrationError = duplicateName ? 'content.customCss.duplicateName'
    : saved.length >= MAX_SAVED_CHAT_CSS ? 'content.customCss.libraryFull' : null
  const canRegister = runtime !== null && !busy && !tooLarge && !!css.trim()
    && !!name && name.length <= MAX_CSS_NAME_LENGTH && !registrationError
  const currentPreset = CHAT_CSS_PRESETS.find(entry => entry.css === active.css)
  const currentName = currentPreset ? t(currentPreset.labelKey)
    : saved.find(entry => entry.css === active.css)?.name ?? t('content.customCss.title')
  const stateKey = changed ? 'content.customCss.unapplied' : stopped
    ? confirmedStopped ? 'content.customCss.savedButPaused' : 'content.customCss.pausePendingState'
    : active.enabled ? 'content.customCss.sameAsApplied' : 'content.customCss.savedButDisabled'
  const unconfirmed = hasFailedCssSave || recovery.failed || (stopped && !confirmedStopped)
  const statusKey = recovery.pending ? 'content.customCss.saving'
    : unconfirmed ? 'content.customCss.stopUnconfirmed'
      : inUse ? 'content.customCss.active' : 'content.customCss.inactive'
  const canStop = inUse || operation === 'apply' || (hasFailedCssSave && !confirmedStopped) || recovery.failed || (recovery.pending && !recovery.target)
  const successKey = feedback?.kind === 'success' && !recovery.failed
    ? feedback.operation === 'apply' && stopped ? null : SUCCESS_KEYS[feedback.operation] : null

  const isSaving = () => store.get(customCssOperationAtom) !== null || store.get(customCssRecoveryAtom).pending
  const focusInput = () => {
    if (store.get(customCssEditorUiAtom).expanded) editorRef.current?.focus()
    else chooserRef.current?.focus()
  }
  useEffect(() => {
    if (previousEditing.current === editorUi.expanded) return
    previousEditing.current = editorUi.expanded
    if (editorUi.expanded) editorRef.current?.focus()
    else editRef.current?.focus()
  }, [editorUi.expanded])
  useEffect(() => { if (confirmation) cancelRef.current?.focus() }, [confirmation])
  useEffect(() => {
    const trigger = stopTrigger.current
    if (!trigger || recovery.pending) return
    if (recovery.failed) {
      stopTrigger.current = null
      return
    }
    if (canStop) return
    stopTrigger.current = null
    const root = applyButtonRef.current?.getRootNode()
    const focused = (root instanceof ShadowRoot ? root.activeElement : null) ?? trigger.ownerDocument.activeElement
    const focusLost = !focused || focused === trigger.ownerDocument.body || (root instanceof ShadowRoot && focused === root.host)
    if (!focusLost && focused !== trigger) return
    if (applyButtonRef.current && !applyButtonRef.current.disabled) applyButtonRef.current.focus()
    else if (editorUi.expanded) editorRef.current?.focus()
    else editRef.current?.focus()
  }, [canStop, recovery.pending, recovery.failed, editorUi.expanded])
  useEffect(() => {
    if (editorUi.expanded && editorUi.registering) nameRef.current?.focus()
  }, [editorUi.expanded, editorUi.registering])
  useEffect(() => {
    const form = restoreRegistrationFocus.current
    if (busy || !form) return
    restoreRegistrationFocus.current = null
    if (!editorUi.expanded) return
    // Restore focus only while it still belongs to this save, or was lost when
    // its form disappeared. A close confirmation or another control owns focus
    // once the user has moved there. Resolve focus inside the extension root too.
    const root = editorRef.current?.getRootNode()
    const focused = (root instanceof ShadowRoot ? root.activeElement : null) ?? form.ownerDocument.activeElement
    const focusLost = !focused || focused === form.ownerDocument.body || (root instanceof ShadowRoot && focused === root.host)
    if (!focusLost && !form.contains(focused)) return
    if (feedback?.kind === 'error' && editorUi.registering) nameRef.current?.focus()
    else editorRef.current?.focus()
  }, [busy, editorUi.expanded, editorUi.registering, feedback])

  const load = (text: string, nextSource: CustomCssSource) => {
    setDraft({ css: text, baseline: store.get(customCssAtom) })
    setEditorUi(current => ({ ...current, source: nextSource }))
    setConfirmation(null)
    store.set(customCssFeedbackAtom, null)
    focusInput()
  }
  const requestLoad = (text: string, nextSource: CustomCssSource = null) => {
    // Switching recoverable samples/copies needs no confirmation. A genuine
    // unsaved edit does; cancelling also leaves the selected option unchanged.
    const unkept = changed && !example && !saved.some(entry => entry.css === css)
    if (unkept && css !== text) setConfirmation({ kind: 'load', css: text, source: nextSource })
    else load(text, nextSource)
  }
  const apply = (confirmedExpected?: ChatCssCustomization) => {
    if (!runtime || !canApply || isSaving()) return
    if (conflict && !confirmedExpected) {
      setConfirmation({ kind: 'overwrite', expected: active })
      return
    }
    const submitted = { css, baseline: confirmedExpected ?? draft?.baseline ?? active }
    setDraft(submitted)
    setConfirmation(null)
    const settle = () => {
      // Activation can save the source and then fail to resume. Advance only
      // a matching confirmed source, never an arbitrary watched replacement.
      const confirmed = store.get(customCssAtom)
      if (confirmed.enabled && confirmed.css === submitted.css) {
        setDraft(current => current === submitted ? { css: submitted.css, baseline: confirmed } : current)
      }
    }
    void runtime.customCss.activate(submitted.css, submitted.baseline).then(settle, settle)
  }
  const stop = (event: MouseEvent<HTMLButtonElement>) => {
    if (!runtime) return
    stopTrigger.current = event.currentTarget
    setDraft(current => current ?? { css, baseline: store.get(customCssAtom) })
    setConfirmation(null)
    void runtime.customCss.suspend(true).catch(() => { })
  }
  const register = () => {
    if (!runtime || !canRegister || isSaving()) return
    const submitted = store.get(customCssDraftAtom) ?? { css, baseline: active }
    setDraft(submitted)
    const submittedName = store.get(customCssEditorUiAtom).name
    restoreRegistrationFocus.current = nameRef.current?.parentElement ?? null
    void runtime.customCss.register(submittedName, css).then(() => {
      setEditorUi(current => store.get(customCssDraftAtom) === submitted && current.name === submittedName
        ? { ...current, name: '', registering: false } : current)
    }).catch(() => { })
  }
  const cancelRegistration = () => {
    if (isSaving()) return
    setEditorUi(current => ({ ...current, name: '', registering: false }))
    if (store.get(customCssFeedbackAtom)?.operation === 'register') store.set(customCssFeedbackAtom, null)
    editorRef.current?.focus()
  }
  const cancelConfirmation = () => {
    setConfirmation(null)
    focusInput()
  }

  return (
    <fieldset className='ylc-setting-group ylc-custom-css' data-ylc-custom-css
      onKeyDown={event => {
        if (event.defaultPrevented || event.nativeEvent.isComposing || event.key !== 'Escape') return
        if (confirmation) {
          event.preventDefault()
          event.stopPropagation()
          cancelConfirmation()
        } else if (editorUi.expanded && editorUi.registering) {
          event.preventDefault()
          event.stopPropagation()
          cancelRegistration()
        } else if (editorUi.expanded) {
          event.preventDefault()
          event.stopPropagation()
          setEditorUi(current => ({ ...current, expanded: false }))
        }
      }}>
      <legend className='ylc-setting-group-legend'>
        <span className='ylc-custom-css-legend'><TbPalette size={16} aria-hidden='true' />{t('content.customCss.title')}</span>
      </legend>
      <div className='ylc-custom-css-surface'>
        <div className='ylc-custom-css-heading'>
          <span className='ylc-custom-css-current' data-active={inUse && !unconfirmed} role='status'>
            <span className='ylc-custom-css-dot' aria-hidden='true' />
            {t(statusKey)}{inUse && !recovery.pending && !unconfirmed ? ` · ${currentName}` : ''}
          </span>
          {canStop && <button type='button' className='ylc-btn ylc-custom-css-quiet'
            disabled={!runtime || (recovery.pending && recovery.target)} onClick={stop}>
            {t(recovery.failed && recovery.target ? 'content.customCss.retryStop' : 'content.customCss.disable')}
          </button>}
        </div>
        {!editorUi.expanded ? (
          <>
            <label className='ylc-visually-hidden' htmlFor={`${id}-style`}>{t('content.customCss.choosePreset')}</label>
            <select id={`${id}-style`} ref={chooserRef} value={choice} disabled={busy}
              aria-describedby={`${id}-load-help`} onChange={event => {
                const value = event.target.value
                if (value === 'current') requestLoad(active.css)
                else if (value.startsWith('preset:')) {
                  const next = CHAT_CSS_PRESETS.find(entry => entry.id === value.slice(7))
                  if (next) requestLoad(next.css, { kind: 'preset', id: next.id })
                } else if (value.startsWith('saved:')) {
                  const next = saved.find(entry => entry.id === value.slice(6))
                  if (next) requestLoad(next.css, { kind: 'saved', id: next.id })
                }
              }}>
              <optgroup label={t('content.customCss.presets')}>
                {CHAT_CSS_PRESETS.map(entry => <option key={entry.id} value={`preset:${entry.id}`}>{t(entry.labelKey)}</option>)}
              </optgroup>
              {saved.length > 0 && <optgroup label={t('content.customCss.savedList')}>
                {saved.map(entry => <option key={entry.id} value={`saved:${entry.id}`}>{entry.name}</option>)}
              </optgroup>}
              {active.css && <option value='current'>{t('content.customCss.sameAsApplied')}</option>}
              {choice === 'draft' && <option value='draft' disabled>{t('content.customCss.unappliedBadge')}</option>}
            </select>
            <ChatCssExample preset={example} />
            {example?.noteKey && <p className='ylc-custom-css-help'>{t(example.noteKey)}</p>}

          </>
        ) : (
          <>
            <button type='button' className='ylc-btn ylc-custom-css-back'
              onClick={() => setEditorUi(current => ({ ...current, expanded: false }))}>
              <span aria-hidden='true'>‹</span>{t('content.customCss.choosePreset')}
            </button>
            <div className='ylc-custom-css-editor-heading'>
              <label htmlFor={`${id}-editor`}>CSS</label>
              <span id={`${id}-limit`} className='ylc-custom-css-count' data-invalid={tooLarge}>
                {(bytes / 1024).toFixed(1)} / {MAX_CUSTOM_CSS_BYTES / 1024} KiB
              </span>
            </div>
            <textarea ref={editorRef} id={`${id}-editor`} value={css} readOnly={busy} spellCheck={false}
              autoCapitalize='off' autoCorrect='off' wrap='off' dir='ltr' rows={8} aria-invalid={tooLarge}
              aria-describedby={`${id}-limit ${id}-warning ${id}-text-state${tooLarge ? ` ${id}-css-error` : ''}`}
              aria-keyshortcuts='Control+Enter Meta+Enter' placeholder={t('content.customCss.placeholder')}
              onChange={event => {
                setDraft({ css: event.target.value, baseline: draft?.baseline ?? active })
                setConfirmation(null)
                store.set(customCssFeedbackAtom, null)
              }} onKeyDown={event => {
                if (busy || event.nativeEvent.isComposing || event.altKey || event.shiftKey) return
                if (event.key === 'Enter' && event.ctrlKey !== event.metaKey) {
                  event.preventDefault()
                  event.stopPropagation()
                  apply()
                }
              }} />
            <p className='ylc-custom-css-help' id={`${id}-warning`}>{t('content.customCss.warning')}</p>
            <div className='ylc-custom-css-tools'>
              <button type='button' className='ylc-btn ylc-custom-css-quiet' disabled={!runtime || busy || tooLarge || !css.trim()}
                aria-expanded={editorUi.registering} aria-controls={editorUi.registering ? `${id}-register` : undefined}
                onClick={() => setEditorUi(current => ({
                  ...current, registering: true,
                  name: current.name.trim() ? current.name : originalPreset ? t(originalPreset.labelKey) : example ? t(example.labelKey) : ''
                }))}>
                {t('content.customCss.register')}
              </button>
              {selected && <button type='button' className='ylc-btn ylc-custom-css-danger' disabled={!runtime || busy}
                onClick={() => setConfirmation({ kind: 'delete', entry: { ...selected } })}>{t('content.customCss.deleteSaved')}</button>}
              {originalPreset && css !== originalPreset.css && <button type='button' className='ylc-btn ylc-custom-css-quiet' disabled={busy}
                onClick={() => requestLoad(originalPreset.css, source)}>{t('content.customCss.reloadPreset')}</button>}
              {selected && css !== selected.css && <button type='button' className='ylc-btn ylc-custom-css-quiet' disabled={busy}
                onClick={() => requestLoad(selected.css, source)}>{t('content.customCss.reloadSaved')}</button>}
            </div>
            {editorUi.registering && <div className='ylc-custom-css-register' id={`${id}-register`}>
              <label htmlFor={`${id}-name`}>{t('content.customCss.name')}</label>
              <input ref={nameRef} id={`${id}-name`} value={editorUi.name} readOnly={busy} maxLength={MAX_CSS_NAME_LENGTH}
                autoComplete='off' aria-invalid={duplicateName}
                aria-describedby={`${id}-register-help${registrationError ? ` ${id}-register-error` : ''}`}
                onChange={event => {
                  setEditorUi(current => ({ ...current, name: event.target.value }))
                  if (store.get(customCssFeedbackAtom)?.operation === 'register') store.set(customCssFeedbackAtom, null)
                }} onKeyDown={event => {
                  if (busy || event.nativeEvent.isComposing) return
                  if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
                    event.preventDefault()
                    event.stopPropagation()
                    register()
                  }
                }} />
              <p id={`${id}-register-help`} className='ylc-custom-css-help'>{t('content.customCss.registerHelp')}</p>
              <p id={`${id}-register-error`} className='ylc-custom-css-error' aria-live='polite'>{registrationError ? t(registrationError) : ''}</p>
              <div className='ylc-custom-css-actions'>
                <button type='button' className='ylc-btn' onClick={register} disabled={!canRegister}>{t('content.customCss.saveRegistration')}</button>
                <button type='button' className='ylc-btn' onClick={cancelRegistration} disabled={busy}>{t('content.customCss.cancelRegistration')}</button>
              </div>
            </div>}
          </>
        )}
        <p id={`${id}-text-state`} className='ylc-visually-hidden'>{t(stateKey)}</p>
        {source?.kind === 'saved' && !selected && <p className='ylc-custom-css-help'>{t('content.customCss.savedMissing')}</p>}
        {conflict && <p className='ylc-custom-css-notice'>{t('content.customCss.externalChange')}</p>}
        {tooLarge && <p id={`${id}-css-error`} role='alert' className='ylc-custom-css-error'>{t('content.customCss.tooLarge')}</p>}
        {confirmation && <div className='ylc-custom-css-confirm' role='group' aria-label={t('content.customCss.confirmTitle')}>
          <p>{confirmation.kind === 'load' ? t('content.customCss.replaceDraft') : confirmation.kind === 'overwrite'
            ? t('content.customCss.conflict') : `${t('content.customCss.deletePrompt')} ${confirmation.entry.name}`}</p>
          <div className='ylc-custom-css-actions'>
            <button ref={cancelRef} type='button' className='ylc-btn' onClick={cancelConfirmation}>{t('content.customCss.cancel')}</button>
            <button type='button' className='ylc-btn' disabled={busy} onClick={() => {
              if (confirmation.kind === 'load') load(confirmation.css, confirmation.source)
              else if (confirmation.kind === 'overwrite') apply(confirmation.expected)
              else if (runtime) {
                const entry = confirmation.entry
                setConfirmation(null)
                focusInput()
                void runtime.customCss.remove(entry).catch(() => { })
              }
            }}>{t(confirmation.kind === 'delete' ? 'content.customCss.deleteSaved'
              : confirmation.kind === 'load' ? 'content.customCss.replaceText' : 'content.customCss.overwriteApply')}</button>
          </div>
        </div>}
        <p id={`${id}-load-help`} className='ylc-visually-hidden'>{t('content.customCss.loadOnly')}</p>
        <button ref={applyButtonRef} type='button' className='ylc-btn ylc-custom-css-primary' data-ylc-css-use
          onClick={() => apply()} disabled={!canApply} aria-busy={busy}>
          {t(busy ? 'content.customCss.saving' : matched ? 'content.customCss.active'
            : stopped && active.css ? 'content.customCss.resume' : 'content.customCss.apply')}
        </button>
        {!editorUi.expanded && (
          <button ref={editRef} type='button' className='ylc-btn ylc-custom-css-edit' aria-expanded={false}
            onClick={() => {
              setDraft(current => current ?? { css, baseline: active })
              setEditorUi(current => ({
                ...current, expanded: true,
                source: current.source ?? (example ? { kind: 'preset', id: example.id } : null)
              }))
            }}>
            <span aria-hidden='true'>{'{ }'}</span>{t('content.customCss.emptyEditor')}<span aria-hidden='true'>›</span>
          </button>
        )}
        {!busy && feedback?.kind === 'error' && !recovery.failed &&
          <p role='alert' className='ylc-custom-css-error'>{t(ERROR_KEYS[feedback.code])}</p>}
        {recovery.failed && <p role='alert' className='ylc-custom-css-error'>{t('content.customCss.recoveryFailed')}</p>}
        {recovery.pending && recovery.target && <p role='status' className='ylc-custom-css-help'>{t('content.customCss.savingStop')}</p>}
        <p role='status' className='ylc-custom-css-feedback'>{!busy && successKey ? t(successKey) : ''}</p>
      </div>
      <p className='ylc-custom-css-context'>{t('content.customCss.description')}</p>
    </fieldset>
  )
}
