import { useStore } from 'jotai'
import { useEffect } from 'react'
import { SETTINGS_FRAME_MESSAGE, type SettingsFrameRequest } from '@/entrypoints/content/settings/settingsFrameMessages'
import { areChatProfilesEqual } from '@/shared/settings/equality'
import type { ChatProfile } from '@/shared/settings/model'
import { editorSessionStateAtom, profileAtom } from '@/shared/state/atoms'

type StylePreview = { profile: ChatProfile; active: boolean }

export const useSettingsStylePreview = (postToParent: (message: SettingsFrameRequest) => void) => {
  const store = useStore()

  useEffect(() => {
    let previewFrame: number | null = null
    let lastSent: StylePreview | null = null

    const cancelPreviewFrame = () => {
      if (previewFrame !== null) cancelAnimationFrame(previewFrame)
      previewFrame = null
    }

    const readPreview = (): StylePreview => {
      const draft = store.get(editorSessionStateAtom).draftProfile
      return { profile: draft ?? store.get(profileAtom), active: draft !== null }
    }

    const sendPreview = (preview: StylePreview) => {
      if (lastSent?.active === preview.active && areChatProfilesEqual(lastSent.profile, preview.profile)) return
      lastSent = preview
      postToParent({ type: SETTINGS_FRAME_MESSAGE.stylePreview, ...preview })
    }

    const publish = () => {
      const preview = readPreview()
      if (!preview.active) {
        cancelPreviewFrame()
        // Send the final value before storage acknowledges it in the content
        // page, and keep later Undo or discrete edits ahead of that preview.
        sendPreview(preview)
        return
      }
      if (previewFrame !== null) return
      previewFrame = requestAnimationFrame(() => {
        previewFrame = null
        sendPreview(readPreview())
      })
    }

    const unsubscribeEditor = store.sub(editorSessionStateAtom, publish)
    const unsubscribeProfile = store.sub(profileAtom, publish)
    if (store.get(editorSessionStateAtom).draftProfile) publish()

    return () => {
      cancelPreviewFrame()
      unsubscribeEditor()
      unsubscribeProfile()
      postToParent({ type: SETTINGS_FRAME_MESSAGE.stylePreview, profile: null, active: false })
    }
  }, [postToParent, store])
}
