import { createStore } from 'jotai/vanilla'
import type { Store } from 'jotai/vanilla/store'
import type { LocaleCode } from '@/shared/i18n/generated/translationTypes'
import { resolveLanguageCode } from '@/shared/i18n/language'
import { loadLocaleMessages } from '@/shared/i18n/loader'
import { normalizeSettingsBackup } from '@/shared/settings/backup'
import { areChatSettingsEqual, areGlobalSettingsEqual } from '@/shared/settings/equality'
import { buildRepositoryBackup, createSettingsRepository, type SettingsRepository } from '@/shared/settings/repository'
import {
  chatSettingsStateAtom,
  globalSettingsStateAtom,
  hydrateAppAtom,
  localeStateAtom,
  localeStateFromMessages,
  replaceExternalChatSettingsAtom,
  replaceExternalGlobalSettingsAtom,
  replaceExternalLocaleAtom,
  replaceImportedSettingsAtom,
} from '@/shared/state/atoms'

export type AppRuntime = {
  store: Store
  setLocale: (locale: LocaleCode) => Promise<void>
  exportSettings: () => ReturnType<typeof buildRepositoryBackup>
  importSettings: (input: unknown) => Promise<void>
  dispose: () => void
}

const bindPersistence = (store: Store, repository: SettingsRepository, isApplyingExternal: () => boolean) => {
  let previousGlobal = store.get(globalSettingsStateAtom)
  let previousChat = store.get(chatSettingsStateAtom)
  let previousLocale = store.get(localeStateAtom).code
  const unsubs = [
    store.sub(globalSettingsStateAtom, () => {
      const next = store.get(globalSettingsStateAtom)
      if (!areGlobalSettingsEqual(previousGlobal, next)) {
        previousGlobal = next
        if (!isApplyingExternal()) void repository.saveGlobal(next)
      }
    }),
    store.sub(chatSettingsStateAtom, () => {
      const next = store.get(chatSettingsStateAtom)
      if (!areChatSettingsEqual(previousChat, next)) {
        previousChat = next
        if (!isApplyingExternal()) void repository.saveChat(next)
      }
    }),
    store.sub(localeStateAtom, () => {
      const next = store.get(localeStateAtom).code
      if (previousLocale !== next) {
        previousLocale = next
        if (!isApplyingExternal()) void repository.saveLocale(next)
      }
    }),
  ]
  return () => {
    unsubs.forEach(unsubscribe => {
      unsubscribe()
    })
  }
}

type AppRuntimeDependencies = {
  loadMessages: typeof loadLocaleMessages
}

const loadMessagesWithEnglishFallback = async (locale: LocaleCode, loadMessages: typeof loadLocaleMessages) => {
  try {
    return await loadMessages(locale)
  } catch (error) {
    if (locale === 'en') throw error
    return loadMessages('en')
  }
}

export const createAppRuntime = async (
  repository = createSettingsRepository(),
  dependencies: AppRuntimeDependencies = { loadMessages: loadLocaleMessages },
): Promise<AppRuntime> => {
  const store = createStore()
  let applyingExternal = false
  let disposed = false
  const applyExternal = (action: () => void) => {
    applyingExternal = true
    try {
      action()
    } finally {
      applyingExternal = false
    }
  }
  const snapshot = await repository.load()
  let localeRequestId = 0
  const messages = await loadMessagesWithEnglishFallback(snapshot.locale, dependencies.loadMessages)
  store.set(hydrateAppAtom, {
    global: snapshot.global,
    chat: snapshot.chat,
    locale: localeStateFromMessages(snapshot.locale, messages),
  })

  const unbindPersistence = bindPersistence(store, repository, () => applyingExternal)
  const unwatch = repository.watch({
    onGlobal: value => applyExternal(() => store.set(replaceExternalGlobalSettingsAtom, value)),
    onChat: value => applyExternal(() => store.set(replaceExternalChatSettingsAtom, value)),
    onLocale: locale => {
      const requestId = ++localeRequestId
      void loadMessagesWithEnglishFallback(locale, dependencies.loadMessages)
        .then(messages => {
          if (!disposed && requestId === localeRequestId) {
            applyExternal(() => store.set(replaceExternalLocaleAtom, localeStateFromMessages(locale, messages)))
          }
        })
        .catch(() => {
          // Keep the currently rendered locale when even the English base asset is unavailable.
        })
    },
  })

  return {
    store,
    async setLocale(locale) {
      const resolved = resolveLanguageCode(locale)
      const requestId = ++localeRequestId
      const [messages] = await Promise.all([
        loadMessagesWithEnglishFallback(resolved, dependencies.loadMessages),
        repository.saveLocale(resolved),
      ])
      if (!disposed && requestId === localeRequestId) {
        applyExternal(() => store.set(replaceExternalLocaleAtom, localeStateFromMessages(resolved, messages)))
      }
    },
    exportSettings: () =>
      buildRepositoryBackup({
        global: store.get(globalSettingsStateAtom),
        chat: store.get(chatSettingsStateAtom),
        locale: store.get(localeStateAtom).code,
      }),
    async importSettings(input) {
      const current = { globalSetting: store.get(globalSettingsStateAtom), chatSettings: store.get(chatSettingsStateAtom) }
      const normalized = normalizeSettingsBackup(input, current)
      if (!normalized) throw new Error('Unsupported settings backup')
      await repository.flush()
      await repository.replaceSettings(
        {
          ytdLiveChat: Boolean(normalized.globalSetting.ytdLiveChat),
          themeMode: (normalized.globalSetting.themeMode as 'light' | 'dark' | 'system') ?? 'system',
        },
        normalized.chatSettings,
      )
      applyExternal(() => store.set(replaceImportedSettingsAtom, normalized))
    },
    dispose() {
      disposed = true
      unbindPersistence()
      unwatch()
    },
  }
}
