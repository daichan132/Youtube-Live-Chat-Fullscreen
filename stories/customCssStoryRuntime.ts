import { createStore } from 'jotai/vanilla'
import arabic from '@/shared/i18n/assets/ar.json'
import english from '@/shared/i18n/assets/en.json'
import japanese from '@/shared/i18n/assets/ja.json'
import type { LocaleMessages, TranslationKey } from '@/shared/i18n/generated/translationTypes'
import type { AppRuntime } from '@/shared/runtime/createAppRuntime'
import { createCustomCssActions } from '@/shared/runtime/customCssActions'
import { buildSettingsBackup, normalizeSettingsBackup } from '@/shared/settings/backup'
import { CHAT_CSS_PRESETS } from '@/shared/settings/chatCssPresets'
import type { SavedChatCss } from '@/shared/settings/customCss'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { GlobalSettings } from '@/shared/settings/model'
import type { PersistenceDomain, SettingsRepository } from '@/shared/settings/repository'
import {
  chatSettingsStateAtom,
  globalSettingsStateAtom,
  localeStateAtom,
  localeStateFromMessages,
  persistenceStatusAtom,
} from '@/shared/state/atoms'
import {
  customCssAtom,
  customCssFeedbackAtom,
  customCssSuspendedAtom,
  receiveCustomCssSuspendedAtom,
  savedChatCssAtom,
} from '@/shared/state/customCssAtoms'

export type StoryLocale = 'ja' | 'en' | 'ar'
export type StoryTheme = GlobalSettings['themeMode']
export type StorySeed = 'initial' | 'saved' | 'active'
export type FailureMode = 'none' | 'customCss' | 'savedChatCss' | 'customCssSuspended'
export type StorySaveControls = { saveDelayMs: number; failureMode: FailureMode }

const flattenMessages = (input: object, prefix = '', output: Record<string, string> = {}) => {
  for (const [key, value] of Object.entries(input)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') output[path] = value
    else if (value && typeof value === 'object') flattenMessages(value, path, output)
  }
  return output as LocaleMessages
}
const messages: Record<StoryLocale, LocaleMessages> = {
  ja: flattenMessages(japanese),
  en: flattenMessages(english),
  ar: flattenMessages(arabic),
}
export const storyLocale = (value: unknown): StoryLocale => (value === 'en' || value === 'ar' ? value : 'ja')
export const storyTheme = (value: unknown): StoryTheme => (value === 'light' || value === 'system' ? value : 'dark')
export const storyText = (locale: StoryLocale, key: TranslationKey) => messages[locale][key]
const starterCss = (id: string) => {
  const preset = CHAT_CSS_PRESETS.find(entry => entry.id === id)
  if (!preset) throw new Error(`Unknown story starter: ${id}`)
  return preset.css
}
export const EDITED_CSS =
  'yt-live-chat-text-message-renderer #content {\n  border-inline-start: 3px solid #a78bfa;\n  padding-inline-start: 10px;\n}\n'

const personalCopies = (): SavedChatCss[] => [
  { id: 'stream-bubbles', name: '配信用の吹き出し', css: starterCss('bubbles') },
  { id: 'video-outline', name: '動画向けの白文字', css: starterCss('outline') },
  { id: 'purple-accent', name: '紫のアクセント', css: EDITED_CSS },
]

// Only persistence is simulated. The production action boundary, atoms and UI
// own validation, locking, confirmations, focus and pause/resume behavior.
export const createCustomCssStoryRuntime = (
  seed: StorySeed,
  preferences: { locale: StoryLocale; theme: StoryTheme },
  initialControls: StorySaveControls,
) => {
  const store = createStore()
  store.set(chatSettingsStateAtom, structuredClone(DEFAULT_CHAT_SETTINGS))
  store.set(customCssSuspendedAtom, false)
  if (seed !== 'initial') store.set(savedChatCssAtom, personalCopies())
  if (seed === 'active') store.set(customCssAtom, { enabled: true, css: starterCss('bubbles') })

  let disposed = false
  let controls = { ...initialControls }
  let failureArmed = controls.failureMode !== 'none'
  let saving = 0
  const failed = new Map<PersistenceDomain, { sequence: number; commit: () => void }>()
  const sequences = new Map<PersistenceDomain, number>()
  const tails = new Map<PersistenceDomain, Promise<void>>()
  const timers = new Map<ReturnType<typeof setTimeout>, () => void>()
  const setPreferences = ({ locale, theme }: { locale: StoryLocale; theme: StoryTheme }) => {
    store.set(globalSettingsStateAtom, current => ({ ...current, themeMode: theme }))
    store.set(localeStateAtom, localeStateFromMessages(locale, messages[locale]))
  }
  setPreferences(preferences)
  const publishStatus = () =>
    store.set(
      persistenceStatusAtom,
      failed.size
        ? { status: 'error', failedDomains: [...failed.keys()] }
        : saving
          ? { status: 'saving', failedDomains: [] }
          : { status: 'idle', failedDomains: [] },
    )
  const wait = (delayMs: number) =>
    new Promise<void>(resolve => {
      const timer = setTimeout(
        () => {
          timers.delete(timer)
          resolve()
        },
        Math.max(0, delayMs),
      )
      timers.set(timer, resolve)
    })
  const clearConfirmedFailure = (domain: PersistenceDomain) => {
    const feedback = store.get(customCssFeedbackAtom)
    if (feedback?.kind !== 'error' || !['storage', 'unconfirmed'].includes(feedback.code)) return
    if (
      (domain === 'customCss' && ['apply', 'disable'].includes(feedback.operation)) ||
      (domain === 'savedChatCss' && ['register', 'remove'].includes(feedback.operation))
    ) {
      store.set(customCssFeedbackAtom, null)
    }
  }
  const persist = async (domain: PersistenceDomain, commit: () => void, allowFailure = true) => {
    if (disposed) throw new Error('Story has been disposed')
    // Capture controls when saving starts. Changing the toolbar during a save
    // affects the next request, and a retry keeps the captured CSS/copy IDs.
    const delayMs = controls.saveDelayMs
    const shouldFail = allowFailure && failureArmed && controls.failureMode === domain
    if (shouldFail) failureArmed = false
    const sequence = (sequences.get(domain) ?? 0) + 1
    sequences.set(domain, sequence)
    failed.delete(domain)
    saving += 1
    publishStatus()
    const previous = tails.get(domain) ?? Promise.resolve()
    const current = previous
      .catch(() => {})
      .then(async () => {
        if (disposed) throw new Error('Story has been disposed')
        if (sequences.get(domain) !== sequence) return
        await wait(delayMs)
        if (disposed) throw new Error('Story has been disposed')
        // A later Off must supersede an earlier resume, including a Retry.
        // Serializing and confirming only the latest intent mirrors the real
        // repository without installing an obsolete value in the story store.
        if (sequences.get(domain) !== sequence) return
        if (shouldFail) {
          failed.set(domain, { sequence, commit })
          throw new Error('Simulated storage failure')
        }
        commit()
        clearConfirmedFailure(domain)
      })
      .finally(() => {
        saving -= 1
        if (!disposed) publishStatus()
      })
    tails.set(domain, current)
    return current
  }
  const repository: Pick<SettingsRepository, 'saveCustomCss' | 'saveSavedChatCss' | 'saveCustomCssSuspended'> = {
    saveCustomCss: value => {
      const snapshot = { ...value }
      return persist('customCss', () => store.set(customCssAtom, snapshot))
    },
    saveSavedChatCss: value => {
      const snapshot = value.map(entry => ({ ...entry }))
      return persist('savedChatCss', () => store.set(savedChatCssAtom, snapshot))
    },
    saveCustomCssSuspended: value => persist('customCssSuspended', () => store.set(receiveCustomCssSuspendedAtom, value)),
  }
  const runtime: AppRuntime = {
    store,
    customCss: createCustomCssActions(store, repository, () => disposed),
    async setLocale(locale) {
      setPreferences({ locale: storyLocale(locale), theme: store.get(globalSettingsStateAtom).themeMode })
    },
    exportSettings: () =>
      buildSettingsBackup({
        globalSetting: store.get(globalSettingsStateAtom),
        chatSettings: store.get(chatSettingsStateAtom),
        customCss: store.get(customCssAtom),
        savedChatCss: store.get(savedChatCssAtom),
      }),
    async importSettings(input) {
      const normalized = normalizeSettingsBackup(input, {
        globalSetting: store.get(globalSettingsStateAtom),
        chatSettings: store.get(chatSettingsStateAtom),
      })
      if (!normalized) throw new Error('Unsupported settings backup')
      store.set(globalSettingsStateAtom, normalized.globalSetting)
      store.set(chatSettingsStateAtom, normalized.chatSettings)
      store.set(customCssAtom, normalized.customCss)
      store.set(savedChatCssAtom, normalized.savedChatCss)
    },
    async retryPersistence() {
      const retries = [...failed].flatMap(([domain, entry]) =>
        sequences.get(domain) === entry.sequence ? [persist(domain, entry.commit, false)] : [],
      )
      await Promise.all(retries)
    },
    dispose() {
      disposed = true
      for (const [timer, resolve] of timers) {
        clearTimeout(timer)
        resolve()
      }
      timers.clear()
      failed.clear()
      tails.clear()
    },
  }
  return {
    runtime,
    setPreferences,
    setControls(next: StorySaveControls) {
      if (next.failureMode !== controls.failureMode) failureArmed = next.failureMode !== 'none'
      controls = { ...next }
    },
  }
}
