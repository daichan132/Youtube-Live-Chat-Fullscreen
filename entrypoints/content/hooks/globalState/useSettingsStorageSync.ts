import { useEffect } from 'react'
import { browser } from 'wxt/browser'
import { useChatEditorStore } from '@/entrypoints/content/settings/ChatEditorStore'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import type { ChatProfile } from '@/shared/settings/model'
import { resolveSettingsStorageSync } from '@/shared/settings/storageSync'
import { useGlobalSettingStore } from '@/shared/stores/globalSettingStore'

const profilesEqual = (left: ChatProfile, right: ChatProfile) => JSON.stringify(left) === JSON.stringify(right)

export const useSettingsStorageSync = () => {
  useEffect(() => {
    const handleChanged = (changes: Record<string, unknown>, areaName: string) => {
      const decision = resolveSettingsStorageSync(changes, areaName)
      if (!decision.rehydrateGlobal && !decision.rehydrateChatSettings) return

      const previousProfile = decision.rehydrateChatSettings ? useChatSettingsStore.getState().profile : null
      const editorWasActive =
        decision.rehydrateChatSettings &&
        (useChatEditorStore.getState().draftProfile !== null || useChatEditorStore.getState().activeGesture !== null)

      void Promise.all([
        decision.rehydrateGlobal ? useGlobalSettingStore.persist.rehydrate() : Promise.resolve(),
        decision.rehydrateChatSettings ? useChatSettingsStore.persist.rehydrate() : Promise.resolve(),
      ]).then(() => {
        if (!decision.rehydrateChatSettings || !previousProfile) return
        const nextProfile = useChatSettingsStore.getState().profile
        if (editorWasActive || !profilesEqual(previousProfile, nextProfile)) {
          useChatEditorStore.getState().clear()
        }
      })
    }

    browser.storage.onChanged.addListener(handleChanged)
    return () => {
      browser.storage.onChanged.removeListener(handleChanged)
    }
  }, [])
}
