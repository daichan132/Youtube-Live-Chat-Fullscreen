import { createStore } from 'jotai/vanilla'
import type { Store } from 'jotai/vanilla/store'
import type { LocaleCode } from '@/shared/i18n/generated/translationTypes'
import { resolveLanguageCode } from '@/shared/i18n/language'
import { loadLocaleMessages } from '@/shared/i18n/loader'
import { normalizeSettingsBackup } from '@/shared/settings/backup'
import { areChatAppearanceSettingsEqual, areChatGeometriesEqual } from '@/shared/settings/equality'
import {
  buildRepositoryBackup,
  createSettingsRepository,
  type SettingsRepository,
  type SettingsSnapshot,
} from '@/shared/settings/repository'
import {
  chatSettingsStateAtom,
  globalSettingsStateAtom,
  hydrateAppAtom,
  localeStateAtom,
  localeStateFromMessages,
  replaceExternalAppearanceAtom,
  replaceExternalEnabledAtom,
  replaceExternalGeometryAtom,
  replaceExternalLocaleAtom,
  replaceExternalThemeAtom,
  replaceImportedSettingsAtom,
  replacePersistenceStatusAtom,
} from '@/shared/state/atoms'

export type AppRuntime = {
  store: Store
  setLocale: (locale: LocaleCode) => Promise<void>
  exportSettings: () => ReturnType<typeof buildRepositoryBackup>
  importSettings: (input: unknown) => Promise<void>
  retryPersistence: () => Promise<void>
  dispose: () => void
}

const ignoreHandledPersistenceFailure = (promise: Promise<void>) => {
  void promise.catch(() => {
    // The repository publishes the failure through persistenceStatusAtom.
  })
}

const bindPersistence = (store: Store, repository: SettingsRepository, isApplyingExternal: () => boolean) => {
  let previousGlobal = store.get(globalSettingsStateAtom)
  let previousChat = store.get(chatSettingsStateAtom)
  let previousLocale = store.get(localeStateAtom).code

  const unsubs = [
    store.sub(globalSettingsStateAtom, () => {
      const next = store.get(globalSettingsStateAtom)
      const previous = previousGlobal
      previousGlobal = next
      if (isApplyingExternal()) return
      if (previous.ytdLiveChat !== next.ytdLiveChat) ignoreHandledPersistenceFailure(repository.saveEnabled(next.ytdLiveChat))
      if (previous.themeMode !== next.themeMode) ignoreHandledPersistenceFailure(repository.saveTheme(next.themeMode))
    }),
    store.sub(chatSettingsStateAtom, () => {
      const next = store.get(chatSettingsStateAtom)
      const previous = previousChat
      previousChat = next
      if (isApplyingExternal()) return
      if (!areChatAppearanceSettingsEqual(previous, next)) {
        ignoreHandledPersistenceFailure(repository.saveAppearance({ profile: next.profile, presets: next.presets }))
      }
      if (!areChatGeometriesEqual(previous.geometry, next.geometry)) {
        ignoreHandledPersistenceFailure(repository.saveGeometry(next.geometry))
      }
    }),
    store.sub(localeStateAtom, () => {
      const next = store.get(localeStateAtom).code
      const previous = previousLocale
      previousLocale = next
      if (!isApplyingExternal() && previous !== next) ignoreHandledPersistenceFailure(repository.saveLocale(next))
    }),
  ]

  return () => {
    for (const unsubscribe of unsubs) unsubscribe()
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
  let initialized = false
  let pendingEnabled: boolean | undefined
  let pendingTheme: SettingsSnapshot['global']['themeMode'] | undefined
  let pendingAppearance: Pick<SettingsSnapshot['chat'], 'profile' | 'presets'> | undefined
  let pendingGeometry: SettingsSnapshot['chat']['geometry'] | undefined
  let pendingLocale: LocaleCode | undefined
  let localeRequestId = 0

  const applyExternal = (action: () => void) => {
    applyingExternal = true
    try {
      action()
    } finally {
      applyingExternal = false
    }
  }

  const applyWatchedLocale = (locale: LocaleCode) => {
    const requestId = ++localeRequestId
    void loadMessagesWithEnglishFallback(locale, dependencies.loadMessages)
      .then(messages => {
        if (!disposed && initialized && requestId === localeRequestId) {
          applyExternal(() => store.set(replaceExternalLocaleAtom, localeStateFromMessages(locale, messages)))
        }
      })
      .catch(() => {
        // Keep the currently rendered locale when even the English base asset is unavailable.
      })
  }

  let unwatch = () => {}
  let unsubscribePersistence = () => {}
  let unbindPersistence = () => {}
  try {
    unsubscribePersistence = repository.subscribePersistence(status => {
      if (!disposed) store.set(replacePersistenceStatusAtom, status)
    })
    unwatch = repository.watch({
      onEnabled: value => {
        if (disposed) return
        if (!initialized) {
          pendingEnabled = value
          return
        }
        applyExternal(() => store.set(replaceExternalEnabledAtom, value))
      },
      onTheme: value => {
        if (disposed) return
        if (!initialized) {
          pendingTheme = value
          return
        }
        applyExternal(() => store.set(replaceExternalThemeAtom, value))
      },
      onAppearance: value => {
        if (disposed) return
        if (!initialized) {
          pendingAppearance = value
          return
        }
        applyExternal(() => store.set(replaceExternalAppearanceAtom, value))
      },
      onGeometry: value => {
        if (disposed) return
        if (!initialized) {
          pendingGeometry = value
          return
        }
        applyExternal(() => store.set(replaceExternalGeometryAtom, value))
      },
      onLocale: locale => {
        if (disposed) return
        if (!initialized) {
          pendingLocale = locale
          localeRequestId += 1
          return
        }
        applyWatchedLocale(locale)
      },
    })

    const snapshot = await repository.load()
    let hydratedLocale = pendingLocale ?? snapshot.locale
    let messages: Awaited<ReturnType<typeof loadLocaleMessages>>
    while (true) {
      const requestId = localeRequestId
      messages = await loadMessagesWithEnglishFallback(hydratedLocale, dependencies.loadMessages)
      if (requestId === localeRequestId) break
      hydratedLocale = pendingLocale ?? snapshot.locale
    }

    const appearance = pendingAppearance ?? snapshot.chat
    store.set(hydrateAppAtom, {
      global: {
        ytdLiveChat: pendingEnabled ?? snapshot.global.ytdLiveChat,
        themeMode: pendingTheme ?? snapshot.global.themeMode,
      },
      chat: {
        profile: appearance.profile,
        presets: appearance.presets,
        geometry: pendingGeometry ?? snapshot.chat.geometry,
      },
      locale: localeStateFromMessages(hydratedLocale, messages),
    })
    unbindPersistence = bindPersistence(store, repository, () => applyingExternal)
    initialized = true
  } catch (error) {
    disposed = true
    unbindPersistence()
    unwatch()
    unsubscribePersistence()
    throw error
  }

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
    retryPersistence: () => repository.retryFailed(),
    dispose() {
      if (disposed) return
      disposed = true
      unbindPersistence()
      unwatch()
      unsubscribePersistence()
    },
  }
}
