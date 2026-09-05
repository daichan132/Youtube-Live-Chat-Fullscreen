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
  type SettingsCommitSource,
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
  replacePersistenceStatusAtom,
} from '@/shared/state/atoms'
import { clearStyleHistoryAtom } from '@/shared/state/commands'

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
  let localLocaleRequestId: number | null = null

  const applyExternal = (action: () => void) => {
    const previous = applyingExternal
    applyingExternal = true
    try {
      action()
    } finally {
      applyingExternal = previous
    }
  }

  const applyWatchedLocale = (locale: LocaleCode, source: SettingsCommitSource = 'external') => {
    // Only an acknowledgement of our own earlier write may be ignored while
    // the next local selection loads. An external commit is authoritative even
    // when it happens to match the rendered locale.
    if (source === 'readback' && localLocaleRequestId === localeRequestId) return
    const requestId = ++localeRequestId
    if (store.get(localeStateAtom).code === locale) return
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
      onAppearance: (value, source) => {
        if (disposed) return
        if (!initialized) {
          pendingAppearance = value
          return
        }
        applyExternal(() => {
          store.set(replaceExternalAppearanceAtom, value)
          if (source === 'import') store.set(clearStyleHistoryAtom)
        })
      },
      onGeometry: value => {
        if (disposed) return
        if (!initialized) {
          pendingGeometry = value
          return
        }
        applyExternal(() => store.set(replaceExternalGeometryAtom, value))
      },
      onLocale: (locale, source) => {
        if (disposed) return
        if (!initialized) {
          pendingLocale = locale
          localeRequestId += 1
          return
        }
        applyWatchedLocale(locale, source)
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
      if (disposed) return
      const resolved = resolveLanguageCode(locale)
      const requestId = ++localeRequestId
      localLocaleRequestId = requestId
      try {
        const messages = await loadMessagesWithEnglishFallback(resolved, dependencies.loadMessages)
        if (disposed || requestId !== localeRequestId) return
        applyExternal(() => store.set(replaceExternalLocaleAtom, localeStateFromMessages(resolved, messages)))
        localLocaleRequestId = null
        // Keep the selected language visible if persistence fails. Retry and
        // error status belong to the repository, not to message loading.
        await repository.saveLocale(resolved)
      } finally {
        if (localLocaleRequestId === requestId) localLocaleRequestId = null
      }
    },
    exportSettings: () =>
      buildRepositoryBackup({
        global: store.get(globalSettingsStateAtom),
        chat: store.get(chatSettingsStateAtom),
        locale: store.get(localeStateAtom).code,
      }),
    async importSettings(input) {
      // File.text() can finish after the extension page has been disposed.
      if (disposed) throw new Error('App runtime has been disposed')
      const current = { globalSetting: store.get(globalSettingsStateAtom), chatSettings: store.get(chatSettingsStateAtom) }
      const normalized = normalizeSettingsBackup(input, current)
      if (!normalized) throw new Error('Unsupported settings backup')
      // The repository publishes confirmed domains under its sequence guards.
      // Applying normalized here would overwrite newer changes after the await.
      await repository.replaceSettings(normalized.globalSetting, normalized.chatSettings)
    },
    retryPersistence: () => (disposed ? Promise.resolve() : repository.retryFailed()),
    dispose() {
      if (disposed) return
      disposed = true
      unbindPersistence()
      unwatch()
      unsubscribePersistence()
    },
  }
}
