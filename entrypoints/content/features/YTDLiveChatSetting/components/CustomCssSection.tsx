import { useAtom, useAtomValue, useStore } from 'jotai'
import { useEffect, useId, useRef, useState } from 'react'
import { CustomCssRecovery } from '@/shared/components/CustomCssRecovery'
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
import { persistenceStatusAtom } from '@/shared/state/atoms'
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
  const nameRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef<'editor' | 'registration' | null>(null)
  const id = useId()
  const css = draft?.css ?? active.css
  const changed = css !== active.css
  const bytes = utf8Bytes(css)
  const tooLarge = (() => {
    if (bytes > MAX_CUSTOM_CSS_BYTES) return true
    try {
      // Match the persistence boundary, including escaped JSON size.
      assertCustomCss({ enabled: true, css })
      return false
    } catch {
      return true
    }
  })()
  const hasFailedCssSave = persistence.status === 'error' && persistence.failedDomains.includes('customCss')
  const busy = operation !== null || recovery.pending
  const conflict = draft !== null && !areCustomCssEqual(draft.baseline, active)
  const source = editorUi.source
  const selected = source?.kind === 'saved' ? saved.find(entry => entry.id === source.id) : undefined
  const preset = source?.kind === 'preset' ? CHAT_CSS_PRESETS.find(entry => entry.id === source.id) : undefined
  const canApply = runtime !== null && !busy && !tooLarge && css.trim().length > 0
    && (changed || !active.enabled || hasFailedCssSave)
  const name = editorUi.name.trim()
  const duplicateName = name.length > 0 && saved.some(entry => entry.name.trim() === name)
  const registrationError = duplicateName ? 'content.customCss.duplicateName'
    : saved.length >= MAX_SAVED_CHAT_CSS ? 'content.customCss.libraryFull' : null
  const canRegister = runtime !== null && !busy && !tooLarge && css.trim().length > 0
    && name.length > 0 && name.length <= MAX_CSS_NAME_LENGTH && !registrationError
  const stateKey = changed ? 'content.customCss.unapplied' : !active.css.trim() ? 'content.customCss.emptyEditor'
    : stopped ? confirmedStopped ? 'content.customCss.savedButPaused' : 'content.customCss.pausePendingState'
      : active.enabled ? 'content.customCss.sameAsApplied' : 'content.customCss.savedButDisabled'
  const successKey = feedback?.kind === 'success'
    ? feedback.operation === 'apply' && stopped
      ? confirmedStopped ? 'content.customCss.savedWhileStopped' : 'content.customCss.savedWithPendingStop'
      : SUCCESS_KEYS[feedback.operation]
    : null

  useEffect(() => {
    if (busy || !restoreFocus.current) return
    const target = restoreFocus.current
    restoreFocus.current = null
    // A completed request must not reopen or focus a collapsed editor.
    if (!editorUi.expanded) return
    if (target === 'registration' && feedback?.kind === 'error' && editorUi.registering) nameRef.current?.focus()
    else editorRef.current?.focus()
  }, [busy, editorUi.expanded, editorUi.registering, feedback])
  useEffect(() => {
    if (confirmation) cancelRef.current?.focus()
  }, [confirmation])
  useEffect(() => {
    if (editorUi.registering) nameRef.current?.focus()
  }, [editorUi.registering])

  const load = (text: string, source: CustomCssSource) => {
    setDraft({ css: text, baseline: store.get(customCssAtom) })
    setEditorUi(current => ({ ...current, source }))
    setConfirmation(null)
    store.set(customCssFeedbackAtom, null)
    editorRef.current?.focus()
  }
  const requestLoad = (text: string, source: CustomCssSource = null) => {
    if (changed && css !== text) setConfirmation({ kind: 'load', css: text, source })
    else load(text, source)
  }
  const isSaving = () => store.get(customCssOperationAtom) !== null || store.get(customCssRecoveryAtom).pending
  const apply = (confirmedExpected?: ChatCssCustomization) => {
    if (!runtime || !canApply || isSaving()) return
    if (conflict && !confirmedExpected) {
      // Remember what the user was asked to replace. A later external update
      // must pass through conflict handling again, not an unrestricted force.
      setConfirmation({ kind: 'overwrite', expected: active })
      return
    }
    const submittedCss = css
    const expected = confirmedExpected ?? draft?.baseline ?? active
    const submitted = { css: submittedCss, baseline: expected }
    setDraft(submitted)
    if (confirmedExpected) restoreFocus.current = 'editor'
    setConfirmation(null)
    void runtime.customCss.apply(submittedCss, expected).then(() => {
      // Preserve the applied text even if another view changes storage just
      // after confirmation. Clearing to null would expose that newer text.
      setDraft(current => current === submitted
        ? { css: submittedCss, baseline: { css: submittedCss, enabled: true } }
        : current)
    }).catch(() => {
      // Runtime feedback and the page-local draft survive tab remounts.
    })
  }
  const disable = () => {
    if (!runtime || isSaving()) return
    const before = store.get(customCssAtom)
    const submitted = store.get(customCssDraftAtom) ?? { css, baseline: before }
    // Disabling must preserve the visible text just like Apply/Register.
    setDraft(submitted)
    setConfirmation(null)
    void runtime.customCss.disable().then(() => {
      // Our own confirmed disable is not an external editing conflict. Keep
      // any pre-existing conflict, a later editor session, or a newer draft.
      setDraft(current => current === submitted && areCustomCssEqual(submitted.baseline, before)
        ? { ...submitted, baseline: { ...before, enabled: false } }
        : current)
    }).catch(() => {})
  }
  const register = () => {
    if (!runtime || !canRegister || isSaving()) return
    // Freeze the visible source even when registering the current applied CSS
    // without first editing it. A watched change must not replace this input.
    const submittedDraft = store.get(customCssDraftAtom) ?? { css, baseline: active }
    setDraft(submittedDraft)
    const submittedName = store.get(customCssEditorUiAtom).name
    restoreFocus.current = 'registration'
    void runtime.customCss.register(submittedName, css).then(() => {
      // A closed/reopened editor may contain the same name but be a new edit.
      setEditorUi(current => store.get(customCssDraftAtom) === submittedDraft && current.name === submittedName
        ? { ...current, name: '', registering: false } : current)
    }).catch(() => {})
  }
  const cancelRegistration = () => {
    if (isSaving()) return
    setEditorUi(current => ({ ...current, name: '', registering: false }))
    if (store.get(customCssFeedbackAtom)?.operation === 'register') store.set(customCssFeedbackAtom, null)
    editorRef.current?.focus()
  }
  const cancelConfirmation = () => {
    setConfirmation(null)
    editorRef.current?.focus()
  }

  return (
    <details
      className='ylc-custom-css'
      data-ylc-custom-css
      open={editorUi.expanded}
      onToggle={event => {
        const expanded = event.currentTarget.open
        setEditorUi(current => current.expanded === expanded ? current : { ...current, expanded })
      }}
    >
      <summary>
        <span className='ylc-custom-css-chevron' aria-hidden='true' />
        <span>{t('content.customCss.title')}</span>
        <span className='ylc-custom-css-badge' data-stopped={stopped} data-active={!stopped && active.enabled}>
          {stopped ? t(confirmedStopped ? 'content.customCss.stopped' : 'content.customCss.stopUnconfirmed') : active.enabled ? t('content.customCss.active') : t('content.customCss.inactive')}
          {changed && <span className='ylc-custom-css-draft-indicator'>{t('content.customCss.unappliedBadge')}</span>}
        </span>
      </summary>
      <div className='ylc-custom-css-body'>
        <p className='ylc-custom-css-help' id={`${id}-help`}>{t('content.customCss.description')}</p>
        <p id={`${id}-warning`} className='ylc-custom-css-warning'>{t('content.customCss.warning')}</p>
        <fieldset className='ylc-custom-css-fieldset' aria-busy={busy}>
          <legend className='ylc-visually-hidden'>{t('content.customCss.title')}</legend>
          <div className='ylc-custom-css-sources'>
            <label htmlFor={`${id}-presets`}>
              {t('content.customCss.presets')}
              <select
                id={`${id}-presets`}
                disabled={busy}
                value={preset?.id ?? ''}
                aria-describedby={`${id}-preset-help${preset ? ` ${id}-preset-info` : ''}`}
                onChange={event => {
                  const next = CHAT_CSS_PRESETS.find(item => item.id === event.target.value)
                  if (next) requestLoad(next.css, { kind: 'preset', id: next.id })
                }}
              >
                <option value='' disabled>{t('content.customCss.choosePreset')}</option>
                {CHAT_CSS_PRESETS.map(item => <option key={item.id} value={item.id}>{t(item.labelKey)}</option>)}
              </select>
            </label>
            <label htmlFor={`${id}-saved`}>
              {t('content.customCss.savedList')} <span className='ylc-custom-css-count'>{saved.length} / {MAX_SAVED_CHAT_CSS}</span>
              <select id={`${id}-saved`} disabled={busy || saved.length === 0} value={selected?.id ?? ''}
                aria-describedby={`${id}-preset-help${saved.length === 0 ? ` ${id}-saved-empty` : selected ? ` ${id}-saved-info` : ''}`}
                onChange={event => {
                const entry = saved.find(item => item.id === event.target.value)
                // Do not change the selected registration before a pending
                // replacement is confirmed; Cancel must leave it unchanged.
                if (entry) requestLoad(entry.css, { kind: 'saved', id: entry.id })
              }}>
                <option value='' disabled>{t(saved.length === 0 ? 'content.customCss.noSavedCss' : 'content.customCss.chooseSaved')}</option>
                {saved.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </label>
          </div>
          <p className='ylc-custom-css-help' id={`${id}-preset-help`}>{t('content.customCss.loadOnly')}</p>
          {preset ? (
            <div className='ylc-custom-css-preset-info' id={`${id}-preset-info`} aria-live='polite'>
              <p className='ylc-custom-css-preset-heading'>
                <strong>{t(preset.labelKey)}</strong>
                <span>{t(css === preset.css ? 'content.customCss.presetLoaded' : 'content.customCss.presetEdited')}</span>
              </p>
              <p>{t(preset.descriptionKey)}</p>
              {preset.noteKey && <p className='ylc-custom-css-preset-note'>{t(preset.noteKey)}</p>}
              {css !== preset.css && (
                <button type='button' className='ylc-btn' disabled={busy} onClick={() => requestLoad(preset.css, { kind: 'preset', id: preset.id })}>
                  {t('content.customCss.reloadPreset')}
                </button>
              )}
            </div>
          ) : selected ? (
            <div className='ylc-custom-css-preset-info' id={`${id}-saved-info`}>
              <p className='ylc-custom-css-preset-heading'>
                <strong>{selected.name}</strong>
                <span>{t(css === selected.css ? 'content.customCss.savedLoaded' : 'content.customCss.savedEdited')}</span>
              </p>
              <p>{t('content.customCss.savedHelp')}</p>
              <div className='ylc-custom-css-source-actions'>
                {css !== selected.css && <button type='button' className='ylc-btn' disabled={busy}
                  onClick={() => requestLoad(selected.css, { kind: 'saved', id: selected.id })}>
                  {t('content.customCss.reloadSaved')}
                </button>}
                <button type='button' className='ylc-btn ylc-custom-css-danger' disabled={!runtime || busy}
                  onClick={() => setConfirmation({ kind: 'delete', entry: { ...selected } })}>
                  {t('content.customCss.deleteSaved')}
                </button>
              </div>
            </div>
          ) : (
            <p className='ylc-custom-css-help'>{t(source?.kind === 'saved' ? 'content.customCss.savedMissing' : 'content.customCss.presetHelp')}</p>
          )}
          {saved.length === 0 && <p id={`${id}-saved-empty`} className='ylc-custom-css-help'>{t('content.customCss.savedEmptyHelp')}</p>}
          <div className='ylc-custom-css-editor-heading'>
            <label htmlFor={`${id}-editor`}>CSS</label>
            <span id={`${id}-limit`} className='ylc-custom-css-count' data-invalid={tooLarge}>
              {(bytes / 1024).toFixed(1)} / {MAX_CUSTOM_CSS_BYTES / 1024} KiB
            </span>
          </div>
          <textarea
            ref={editorRef}
            id={`${id}-editor`}
            value={css}
            readOnly={busy}
            spellCheck={false}
            autoCapitalize='off'
            autoCorrect='off'
            wrap='off'
            dir='ltr'
            rows={9}
            aria-invalid={tooLarge}
            aria-describedby={`${id}-help ${id}-limit ${id}-warning ${id}-text-state${tooLarge ? ` ${id}-css-error` : ''}`}
            aria-keyshortcuts='Control+Enter Meta+Enter'
            placeholder={t('content.customCss.placeholder')}
            onChange={event => {
              setDraft({ css: event.target.value, baseline: draft?.baseline ?? active })
              setConfirmation(null)
              store.set(customCssFeedbackAtom, null)
            }}
            onKeyDown={event => {
              if (busy || event.nativeEvent.isComposing || event.altKey || event.shiftKey) return
              if (event.key === 'Enter' && event.ctrlKey !== event.metaKey) {
                event.preventDefault()
                event.stopPropagation()
                apply()
              }
            }}
          />
          <p id={`${id}-text-state`} className='ylc-custom-css-text-state' data-dirty={changed}>{t(stateKey)}</p>
          {conflict && <p className='ylc-custom-css-help'>{t('content.customCss.externalChange')}</p>}
          {tooLarge && <p id={`${id}-css-error`} role='alert' className='ylc-custom-css-error'>{t('content.customCss.tooLarge')}</p>}
          {confirmation && (
            <div className='ylc-custom-css-confirm' role='group' aria-label={t('content.customCss.confirmTitle')}
              onKeyDown={event => {
                if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  event.stopPropagation()
                  cancelConfirmation()
                }
              }}>
              <p>{confirmation.kind === 'load' ? t('content.customCss.replaceDraft') : confirmation.kind === 'overwrite'
                ? t('content.customCss.conflict') : `${t('content.customCss.deletePrompt')} ${confirmation.entry.name}`}</p>
              <div className='ylc-custom-css-actions'>
                <button ref={cancelRef} type='button' className='ylc-btn' onClick={cancelConfirmation}>
                  {t('content.customCss.cancel')}
                </button>
                <button type='button' className='ylc-btn' disabled={busy} onClick={() => {
                  if (confirmation.kind === 'load') load(confirmation.css, confirmation.source)
                  else if (confirmation.kind === 'overwrite') apply(confirmation.expected)
                  else if (runtime) {
                    const entry = confirmation.entry
                    restoreFocus.current = 'editor'
                    setConfirmation(null)
                    void runtime.customCss.remove(entry).catch(() => {})
                  }
                }}>
                  {confirmation.kind === 'delete' ? t('content.customCss.deleteSaved') : confirmation.kind === 'load'
                    ? t('content.customCss.replaceText') : t('content.customCss.overwriteApply')}
                </button>
              </div>
            </div>
          )}
          <div className='ylc-custom-css-actions ylc-custom-css-main-actions'>
            <button type='button' className='ylc-btn ylc-custom-css-primary' onClick={() => apply()} disabled={!canApply}>
              {operation === 'apply' ? t('content.customCss.saving') : stopped
                ? t(confirmedStopped ? 'content.customCss.saveWhileStopped' : 'content.customCss.saveWithPendingStop') : t('content.customCss.apply')}
            </button>
            <button
              type='button'
              className='ylc-btn'
              disabled={!runtime || busy || tooLarge || !css.trim()}
              aria-expanded={editorUi.registering}
              aria-controls={editorUi.registering ? `${id}-register` : undefined}
              onClick={() => setEditorUi(current => ({
                ...current,
                registering: !current.registering,
                // Suggest a name only when the user asks to register a copy.
                // Loading a preset alone must not create an unsaved-name warning.
                name: !current.registering && !current.name.trim() && preset ? t(preset.labelKey) : current.name,
              }))}
            >
              {t('content.customCss.register')}
            </button>
          </div>
          {editorUi.registering && (
            <div className='ylc-custom-css-register' id={`${id}-register`}>
              <label htmlFor={`${id}-name`}>{t('content.customCss.name')}</label>
              <input
                ref={nameRef}
                id={`${id}-name`}
                value={editorUi.name}
                readOnly={busy}
                maxLength={MAX_CSS_NAME_LENGTH}
                autoComplete='off'
                aria-invalid={duplicateName}
                aria-describedby={`${id}-register-help${registrationError ? ` ${id}-register-error` : ''}`}
                onChange={event => {
                  setEditorUi(current => ({ ...current, name: event.target.value }))
                  if (store.get(customCssFeedbackAtom)?.operation === 'register') store.set(customCssFeedbackAtom, null)
                }}
                onKeyDown={event => {
                  if (busy || event.nativeEvent.isComposing) return
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    event.stopPropagation()
                    cancelRegistration()
                  } else if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
                    event.preventDefault()
                    event.stopPropagation()
                    register()
                  }
                }}
              />
              <p id={`${id}-register-help`} className='ylc-custom-css-help'>{t('content.customCss.registerHelp')}</p>
              <p id={`${id}-register-error`} className='ylc-custom-css-error' aria-live='polite'>
                {registrationError ? t(registrationError) : ''}
              </p>
              <div className='ylc-custom-css-actions'>
                <button type='button' className='ylc-btn' onClick={register} disabled={!canRegister}>
                  {operation === 'register' ? t('content.customCss.saving') : t('content.customCss.saveRegistration')}
                </button>
                <button type='button' className='ylc-btn' onClick={cancelRegistration} disabled={busy}>
                  {t('content.customCss.cancelRegistration')}
                </button>
              </div>
            </div>
          )}
          <div className='ylc-custom-css-secondary'>
            <button
              type='button'
              className='ylc-btn'
              disabled={!runtime || busy || (!active.enabled && !hasFailedCssSave)}
              onClick={disable}
            >{t('content.customCss.disable')}</button>
            {changed && <button type='button' className='ylc-btn' disabled={busy} onClick={() => requestLoad(active.css)}>
              {t('content.customCss.reloadApplied')}
            </button>}
          </div>
        </fieldset>
        {busy && <p role='status'>{t('content.customCss.saving')}</p>}
        {hasFailedCssSave && feedback?.operation === 'apply' && <p className='ylc-custom-css-help'>{t('content.customCss.failedApplyHelp')}</p>}
        {!busy && feedback?.kind === 'error' && <p role='alert' className='ylc-custom-css-error'>{t(ERROR_KEYS[feedback.code])}</p>}
        {!busy && successKey && <p role='status'>{t(successKey)}</p>}
        <div className='ylc-custom-css-recovery'><CustomCssRecovery /></div>
      </div>
    </details>
  )
}
