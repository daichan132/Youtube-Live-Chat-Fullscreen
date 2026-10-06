import { useAtom, useAtomValue, useStore } from 'jotai'
import { type MouseEvent, useEffect, useId, useRef, useState } from 'react'
import { TbCheck, TbPalette, TbTrash } from '@/shared/components/icons'
import { formatMessage } from '@/shared/i18n/format'
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
import { ChatCssPreview } from './ChatCssPreview'
import './customCssSection.css'

type Confirmation =
  | { kind: 'load'; css: string; source: CustomCssSource; use: boolean; expected: ChatCssCustomization }
  | { kind: 'delete'; entry: SavedChatCss }
  | { kind: 'overwrite'; css: string; source: CustomCssSource; expected: ChatCssCustomization }

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

const isCssWithinLimit = (css: string) => {
  try {
    assertCustomCss({ enabled: true, css })
    return true
  } catch {
    return false
  }
}

type CustomCssSectionProps = {
  onOpenAppearanceSettings?: () => void
}

export const CustomCssSection = ({ onOpenAppearanceSettings }: CustomCssSectionProps) => {
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
  const [browsing, setBrowsing] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const applyButtonRef = useRef<HTMLButtonElement>(null)
  const pickerButtonRef = useRef<HTMLButtonElement>(null)
  const stopTrigger = useRef<HTMLButtonElement | null>(null)
  const restoreRegistrationFocus = useRef<HTMLElement | null>(null)
  const id = useId()
  // Merely opening the editor never creates a draft or selects a suggestion.
  const css = draft?.css ?? active.css
  const changed = css !== active.css
  const source = editorUi.source
  const selected = source?.kind === 'saved' ? saved.find(entry => entry.id === source.id) : undefined
  const originalPreset = source?.kind === 'preset' ? CHAT_CSS_PRESETS.find(entry => entry.id === source.id) : undefined
  const example = CHAT_CSS_PRESETS.find(entry => entry.css === css)
  const sourceName = selected?.css === css ? selected.name : example ? t(example.labelKey) : null
  const bytes = utf8Bytes(css)
  const tooLarge = !isCssWithinLimit(css)
  const hasFailedCssSave = persistence.status === 'error' && persistence.failedDomains.includes('customCss')
  const busy = operation !== null || recovery.pending
  const conflict = draft !== null && !areCustomCssEqual(draft.baseline, active)
  const inUse = active.enabled && !stopped
  const canUse = (text: string) => runtime !== null && !busy && isCssWithinLimit(text) && !!text.trim()
  const matched = inUse && !changed && !hasFailedCssSave && !recovery.failed
  const canApply = canUse(css) && !matched
  const name = editorUi.name.trim()
  const duplicateName = !!name && saved.some(entry => entry.name.trim() === name)
  const registrationError = duplicateName
    ? 'content.customCss.duplicateName'
    : saved.length >= MAX_SAVED_CHAT_CSS
      ? 'content.customCss.libraryFull'
      : null
  const canRegister =
    runtime !== null && !busy && !tooLarge && !!css.trim() && !!name && name.length <= MAX_CSS_NAME_LENGTH && !registrationError
  const stateKey = changed
    ? 'content.customCss.unapplied'
    : stopped
      ? confirmedStopped
        ? 'content.customCss.savedButPaused'
        : 'content.customCss.pausePendingState'
      : active.enabled
        ? 'content.customCss.sameAsApplied'
        : 'content.customCss.savedButDisabled'
  const unconfirmed = hasFailedCssSave || recovery.failed || (stopped && !confirmedStopped)
  const statusKey = recovery.pending
    ? 'content.customCss.saving'
    : unconfirmed
      ? 'content.customCss.stopUnconfirmed'
      : inUse
        ? 'content.customCss.active'
        : 'content.customCss.inactive'
  const canStop =
    inUse || operation === 'apply' || (hasFailedCssSave && !confirmedStopped) || recovery.failed || (recovery.pending && !recovery.target)
  const successKey =
    feedback?.kind === 'success' && !recovery.failed
      ? feedback.operation === 'apply' && stopped
        ? null
        : SUCCESS_KEYS[feedback.operation]
      : null

  const isSaving = () => store.get(customCssOperationAtom) !== null || store.get(customCssRecoveryAtom).pending
  const focusInput = () => editorRef.current?.focus()
  useEffect(() => {
    if (confirmation) cancelRef.current?.focus()
  }, [confirmation])
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
    else editorRef.current?.focus()
  }, [canStop, recovery.pending, recovery.failed])
  useEffect(() => {
    if (editorUi.registering) nameRef.current?.focus()
  }, [editorUi.registering])
  useEffect(() => {
    const form = restoreRegistrationFocus.current
    if (busy || !form) return
    restoreRegistrationFocus.current = null
    // Restore focus only while it still belongs to this save, or was lost when
    // its form disappeared. A close confirmation or another control owns focus
    // once the user has moved there. Resolve focus inside the extension root too.
    const root = editorRef.current?.getRootNode()
    const focused = (root instanceof ShadowRoot ? root.activeElement : null) ?? form.ownerDocument.activeElement
    const focusLost = !focused || focused === form.ownerDocument.body || (root instanceof ShadowRoot && focused === root.host)
    if (!focusLost && !form.contains(focused)) return
    if (feedback?.kind === 'error' && editorUi.registering) nameRef.current?.focus()
    else editorRef.current?.focus()
  }, [busy, editorUi.registering, feedback])

  const load = (text: string, nextSource: CustomCssSource) => {
    setBrowsing(false)
    setDraft({ css: text, baseline: store.get(customCssAtom) })
    setEditorUi(current => ({ ...current, source: nextSource }))
    setConfirmation(null)
    store.set(customCssFeedbackAtom, null)
    focusInput()
  }
  const activate = (text: string, expected: ChatCssCustomization, nextSource: CustomCssSource, focusEditor = false) => {
    if (!runtime || !canUse(text) || isSaving()) return
    // Row Use must submit the chosen copy, not the previous render's textarea.
    const submitted = { css: text, baseline: expected }
    setDraft(submitted)
    setEditorUi(current => ({ ...current, source: nextSource }))
    setConfirmation(null)
    if (focusEditor) focusInput()
    const settle = () => {
      // Activation can save the source and then fail to resume. Advance only
      // a matching confirmed source, never an arbitrary watched replacement.
      const confirmed = store.get(customCssAtom)
      if (confirmed.enabled && confirmed.css === submitted.css) {
        setDraft(current => (current === submitted ? { css: submitted.css, baseline: confirmed } : current))
      }
    }
    void runtime.customCss.activate(submitted.css, submitted.baseline).then(settle, settle)
  }
  const requestLoad = (text: string, nextSource: CustomCssSource = null, use = false) => {
    if (isSaving() || (use && !canUse(text))) return
    // Switching recoverable samples/copies needs no confirmation. A genuine
    // unsaved edit does; cancelling leaves both the text and source unchanged.
    const unkept = changed && !example && !saved.some(entry => entry.css === css)
    const expected = { ...store.get(customCssAtom) }
    if (unkept && css !== text) setConfirmation({ kind: 'load', css: text, source: nextSource, use, expected })
    else if (use) activate(text, expected, nextSource, true)
    else load(text, nextSource)
  }
  const apply = () => {
    if (!canApply || isSaving()) return
    if (conflict) {
      setConfirmation({ kind: 'overwrite', css, source, expected: { ...active } })
      return
    }
    activate(css, draft?.baseline ?? active, source)
  }
  const stop = (event: MouseEvent<HTMLButtonElement>) => {
    if (!runtime) return
    stopTrigger.current = event.currentTarget
    setDraft(current => current ?? { css, baseline: store.get(customCssAtom) })
    setConfirmation(null)
    void runtime.customCss.suspend(true).catch(() => {})
  }
  const register = () => {
    if (!runtime || !canRegister || isSaving()) return
    const submitted = store.get(customCssDraftAtom) ?? { css, baseline: active }
    setDraft(submitted)
    const submittedName = store.get(customCssEditorUiAtom).name
    restoreRegistrationFocus.current = nameRef.current?.parentElement ?? null
    void runtime.customCss
      .register(submittedName, css)
      .then(() => {
        setEditorUi(current =>
          store.get(customCssDraftAtom) === submitted && current.name === submittedName
            ? { ...current, name: '', registering: false }
            : current,
        )
      })
      .catch(() => {})
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
  const rowLabel = (key: TranslationKey, entry: SavedChatCss) => formatMessage(t(key), { name: entry.name })

  return (
    <fieldset
      className='ylc-setting-group ylc-custom-css'
      data-ylc-custom-css
      onKeyDown={event => {
        if (event.defaultPrevented || event.nativeEvent.isComposing || event.key !== 'Escape') return
        if (confirmation) {
          event.preventDefault()
          event.stopPropagation()
          cancelConfirmation()
        } else if (editorUi.registering) {
          event.preventDefault()
          event.stopPropagation()
          cancelRegistration()
        } else if (browsing) {
          event.preventDefault()
          event.stopPropagation()
          setBrowsing(false)
          pickerButtonRef.current?.focus()
        }
      }}
    >
      <legend className='ylc-visually-hidden'>{t('content.customCss.title')}</legend>
      <div className='ylc-custom-css-surface'>
        {(active.css || stopped || inUse || canStop || recovery.pending || unconfirmed) && (
          <div className='ylc-custom-css-heading'>
            <span className='ylc-custom-css-current' data-active={inUse && !unconfirmed} role='status'>
              <span className='ylc-custom-css-dot' aria-hidden='true' />
              {t(statusKey)}
            </span>
            {canStop && (
              <button
                type='button'
                className='ylc-btn ylc-custom-css-quiet'
                disabled={!runtime || (recovery.pending && recovery.target)}
                onClick={stop}
              >
                {t(recovery.failed && recovery.target ? 'content.customCss.retryStop' : 'content.customCss.disable')}
              </button>
            )}
          </div>
        )}
        <div className='ylc-custom-css-picker-heading'>
          <button
            ref={pickerButtonRef}
            type='button'
            className='ylc-btn ylc-custom-css-picker-toggle'
            disabled={busy}
            aria-expanded={browsing}
            aria-controls={browsing ? `${id}-styles` : undefined}
            onClick={() => setBrowsing(current => !current)}
          >
            <TbPalette size={16} aria-hidden='true' />
            {t('content.customCss.choosePreset')}
          </button>
          {sourceName && (
            <span className='ylc-custom-css-source-name'>
              {sourceName}
              {changed && <span className='ylc-custom-css-draft-badge'>{t('content.customCss.unappliedBadge')}</span>}
            </span>
          )}
        </div>
        {browsing && (
          <div className='ylc-custom-css-preset-grid' id={`${id}-styles`}>
            {CHAT_CSS_PRESETS.map(entry => (
              <article className='ylc-custom-css-preset-card' data-selected={example?.id === entry.id} key={entry.id}>
                <button
                  type='button'
                  className='ylc-custom-css-preset-choice'
                  data-ylc-css-preset-choice={entry.id}
                  aria-label={formatMessage(t('content.customCss.loadPreset'), { name: t(entry.labelKey) })}
                  aria-pressed={example?.id === entry.id}
                  disabled={busy}
                  onClick={() => requestLoad(entry.css, { kind: 'preset', id: entry.id })}
                >
                  {t(entry.labelKey)}
                </button>
                <ChatCssExample preset={entry} compact />
              </article>
            ))}
          </div>
        )}
        {example && (
          <section className='ylc-custom-css-preview' aria-label={t('content.customCss.previewTitle')}>
            <ChatCssPreview preset={example} caption='none' />
            {onOpenAppearanceSettings && (
              <button type='button' className='ylc-custom-css-appearance-link' onClick={onOpenAppearanceSettings}>
                {t('content.customCss.adjustAppearance')}
              </button>
            )}
          </section>
        )}
        <div className='ylc-custom-css-editor-heading'>
          <label htmlFor={`${id}-editor`}>CSS</label>
          <span
            id={`${id}-limit`}
            className={tooLarge || bytes >= MAX_CUSTOM_CSS_BYTES * 0.9 ? 'ylc-custom-css-count' : 'ylc-visually-hidden'}
            data-invalid={tooLarge}
          >
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
          rows={4}
          aria-invalid={tooLarge}
          aria-describedby={`${id}-limit ${id}-warning ${id}-text-state${tooLarge ? ` ${id}-css-error` : ''}`}
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
        <div className='ylc-custom-css-editor-actions'>
          <button
            ref={applyButtonRef}
            type='button'
            className='ylc-btn ylc-custom-css-primary'
            data-ylc-css-use
            onClick={apply}
            disabled={!canApply}
            aria-busy={busy}
          >
            {t(
              busy
                ? 'content.customCss.saving'
                : matched
                  ? 'content.customCss.active'
                  : stopped && active.css
                    ? 'content.customCss.resume'
                    : 'content.customCss.apply',
            )}
          </button>
          <button
            type='button'
            className='ylc-btn'
            disabled={!runtime || busy || tooLarge || !css.trim()}
            aria-expanded={editorUi.registering}
            aria-controls={editorUi.registering ? `${id}-register` : undefined}
            onClick={() =>
              setEditorUi(current => ({
                ...current,
                registering: true,
                name: current.name.trim()
                  ? current.name
                  : source?.kind === 'saved'
                    ? ''
                    : originalPreset
                      ? t(originalPreset.labelKey)
                      : example
                        ? t(example.labelKey)
                        : '',
              }))
            }
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
                if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
                  event.preventDefault()
                  event.stopPropagation()
                  register()
                }
              }}
            />
            <p id={`${id}-register-help`} className='ylc-custom-css-help'>
              {t('content.customCss.registerHelp')}
            </p>
            <p id={`${id}-register-error`} className='ylc-custom-css-error' aria-live='polite'>
              {registrationError ? t(registrationError) : ''}
            </p>
            <div className='ylc-custom-css-actions'>
              <button type='button' className='ylc-btn' onClick={register} disabled={!canRegister}>
                {t('content.customCss.saveRegistration')}
              </button>
              <button type='button' className='ylc-btn' onClick={cancelRegistration} disabled={busy}>
                {t('content.customCss.cancelRegistration')}
              </button>
            </div>
          </div>
        )}
        <div className='ylc-custom-css-tools'>
          {originalPreset && css !== originalPreset.css && (
            <button
              type='button'
              className='ylc-btn ylc-custom-css-quiet'
              disabled={busy}
              onClick={() => requestLoad(originalPreset.css, source)}
            >
              {t('content.customCss.reloadPreset')}
            </button>
          )}
          {selected && css !== selected.css && (
            <button
              type='button'
              className='ylc-btn ylc-custom-css-quiet'
              disabled={busy}
              onClick={() => requestLoad(selected.css, source)}
            >
              {t('content.customCss.reloadSaved')}
            </button>
          )}
        </div>
        <p id={`${id}-text-state`} className='ylc-visually-hidden'>
          {t(stateKey)}
        </p>
        {source?.kind === 'saved' && !selected && <p className='ylc-custom-css-help'>{t('content.customCss.savedMissing')}</p>}
        {conflict && <p className='ylc-custom-css-notice'>{t('content.customCss.externalChange')}</p>}
        {tooLarge && (
          <p id={`${id}-css-error`} role='alert' className='ylc-custom-css-error'>
            {t('content.customCss.tooLarge')}
          </p>
        )}
        {!busy && feedback?.kind === 'error' && !recovery.failed && (
          <p role='alert' className='ylc-custom-css-error'>
            {t(ERROR_KEYS[feedback.code])}
          </p>
        )}
        {recovery.failed && (
          <p role='alert' className='ylc-custom-css-error'>
            {t('content.customCss.recoveryFailed')}
          </p>
        )}
        {recovery.pending && recovery.target && (
          <p role='status' className='ylc-custom-css-help'>
            {t('content.customCss.savingStop')}
          </p>
        )}
        <p role='status' className='ylc-custom-css-feedback'>
          {!busy && successKey ? t(successKey) : ''}
        </p>
        {confirmation && (
          <fieldset className='ylc-custom-css-confirm' aria-label={t('content.customCss.confirmTitle')}>
            <p>
              {confirmation.kind === 'load'
                ? t('content.customCss.replaceDraft')
                : confirmation.kind === 'overwrite'
                  ? t('content.customCss.conflict')
                  : `${t('content.customCss.deletePrompt')} ${confirmation.entry.name}`}
            </p>
            <div className='ylc-custom-css-actions'>
              <button ref={cancelRef} type='button' className='ylc-btn' onClick={cancelConfirmation}>
                {t('content.customCss.cancel')}
              </button>
              <button
                type='button'
                className='ylc-btn'
                disabled={busy}
                onClick={() => {
                  if (confirmation.kind === 'load') {
                    if (confirmation.use) activate(confirmation.css, confirmation.expected, confirmation.source, true)
                    else load(confirmation.css, confirmation.source)
                  } else if (confirmation.kind === 'overwrite') {
                    activate(confirmation.css, confirmation.expected, confirmation.source)
                  } else if (runtime) {
                    const entry = confirmation.entry
                    setConfirmation(null)
                    focusInput()
                    void runtime.customCss.remove(entry).catch(() => {})
                  }
                }}
              >
                {t(
                  confirmation.kind === 'delete'
                    ? 'content.customCss.deleteSaved'
                    : confirmation.kind === 'load'
                      ? confirmation.use
                        ? 'content.customCss.overwriteApply'
                        : 'content.customCss.replaceText'
                      : 'content.customCss.overwriteApply',
                )}
              </button>
            </div>
          </fieldset>
        )}
        {saved.length > 0 && (
          <details className='ylc-custom-css-library'>
            <summary>
              {t('content.customCss.savedList')} <span className='ylc-custom-css-count'>({saved.length})</span>
            </summary>
            <ul className='ylc-custom-css-saved-list'>
              {saved.map(entry => (
                <li className='ylc-preset ylc-custom-css-saved-row' data-ylc-saved-css={entry.id} key={entry.id}>
                  <button
                    type='button'
                    className='ylc-preset-name ylc-custom-css-saved-name'
                    aria-label={rowLabel('content.customCss.loadSaved', entry)}
                    disabled={busy}
                    onClick={() => requestLoad(entry.css, { kind: 'saved', id: entry.id })}
                  >
                    {entry.name}
                  </button>
                  <div className='ylc-preset-actions'>
                    <button
                      type='button'
                      className='ylc-preset-apply'
                      aria-label={rowLabel('content.customCss.useSavedLabel', entry)}
                      disabled={!canUse(entry.css)}
                      onClick={() => requestLoad(entry.css, { kind: 'saved', id: entry.id }, true)}
                    >
                      <TbCheck size={16} aria-hidden='true' />
                      <span>{t('content.customCss.useSaved')}</span>
                    </button>
                    <button
                      type='button'
                      className='ylc-preset-del'
                      aria-label={rowLabel('content.customCss.deleteSavedLabel', entry)}
                      disabled={!runtime || busy}
                      onClick={() => setConfirmation({ kind: 'delete', entry: { ...entry } })}
                    >
                      <TbTrash size={18} aria-hidden='true' />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}
        <details className='ylc-custom-css-disclosure'>
          <summary>{t('content.customCss.warningTitle')}</summary>
          <p className='ylc-custom-css-help' id={`${id}-warning`}>
            {t('content.customCss.warning')}
          </p>
        </details>
      </div>
    </fieldset>
  )
}
