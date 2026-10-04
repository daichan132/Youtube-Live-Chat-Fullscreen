import { useStore } from 'jotai'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { browser, type PublicPath } from 'wxt/browser'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { areChatProfilesEqual } from '@/shared/settings/equality'
import { normalizeChatProfile } from '@/shared/settings/normalizeSettings'
import { profileAtom, settingsPreviewStateAtom } from '@/shared/state/atoms'
import type { ChatRuntime } from '../runtime/ChatRuntime'
import { isSettingsFrameRequest, SETTINGS_FRAME_MESSAGE } from './settingsFrameMessages'

type SettingsFrameProps = {
  returnFocusTo?: HTMLElement | null
  open: boolean
  onClose: () => void
  runtime: Pick<ChatRuntime, 'getDiagnosticReport' | 'restart'>
}

const SETTINGS_PAGE_PATH = 'settings.html' as PublicPath
const settingsPageUrl = new URL(browser.runtime.getURL('/'))
const SETTINGS_PAGE_ORIGIN = `${settingsPageUrl.protocol}//${settingsPageUrl.host}`

const getSettingsPageUrl = () => {
  const url = new URL(browser.runtime.getURL(SETTINGS_PAGE_PATH))
  if (location.origin === 'https://www.youtube.com') url.searchParams.set('parentOrigin', location.origin)
  return url.href
}

export const SettingsFrame = ({ open, onClose, runtime, returnFocusTo }: SettingsFrameProps) => {
  const store = useStore()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const restoreRef = useRef(false)
  const originRootRef = useRef<Node | null>(null)
  useLayoutEffect(() => {
    if (open) {
      originRootRef.current = returnFocusTo?.getRootNode() ?? null
      return
    }
    if (!restoreRef.current) return
    restoreRef.current = false
    const root = originRootRef.current
    const active = root instanceof ShadowRoot ? root.activeElement : document.activeElement
    if (active && active !== document.body && active !== returnFocusTo) return
    const target =
      returnFocusTo?.isConnected && !returnFocusTo.matches(':disabled')
        ? returnFocusTo
        : root instanceof ShadowRoot && root.host.isConnected
          ? root.querySelector<HTMLElement>('[data-ylc-settings-btn]:not(:disabled)')
          : null
    target?.focus()
  }, [open, returnFocusTo])

  const postDiagnosticReport = () => {
    frameRef.current?.contentWindow?.postMessage(
      { type: SETTINGS_FRAME_MESSAGE.diagnosticsReport, report: runtime.getDiagnosticReport() },
      SETTINGS_PAGE_ORIGIN,
    )
  }

  useEffect(() => {
    if (!open) store.set(settingsPreviewStateAtom, null)
    return () => store.set(settingsPreviewStateAtom, null)
  }, [open, store])

  useEffect(() => {
    if (!open) return

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || event.origin !== SETTINGS_PAGE_ORIGIN || !isSettingsFrameRequest(event.data))
        return
      if (event.data.type === SETTINGS_FRAME_MESSAGE.close) {
        store.set(settingsPreviewStateAtom, null)
        restoreRef.current = true
        onClose()
      }
      if (event.data.type === SETTINGS_FRAME_MESSAGE.stylePreview) {
        const { profile, active } = event.data
        const committed = store.get(profileAtom)
        const normalized = profile && normalizeChatProfile(profile, committed)
        store.set(
          settingsPreviewStateAtom,
          normalized && (active || !areChatProfilesEqual(normalized, committed)) ? { profile: normalized, active } : null,
        )
      }
      if (event.data.type === SETTINGS_FRAME_MESSAGE.diagnosticsRequest) postDiagnosticReport()
      if (event.data.type === SETTINGS_FRAME_MESSAGE.runtimeRestart) {
        runtime.restart()
        postDiagnosticReport()
      }
    }

    window.addEventListener('message', handleMessage)
    const unsubscribeProfile = store.sub(profileAtom, () => {
      // An earlier gesture's save can arrive after the next gesture finishes.
      // Release only the matching final value; the settings store forwards
      // authoritative external changes through the same preview channel.
      const preview = store.get(settingsPreviewStateAtom)
      if (preview?.active === false && areChatProfilesEqual(preview.profile, store.get(profileAtom)))
        store.set(settingsPreviewStateAtom, null)
    })
    return () => {
      window.removeEventListener('message', handleMessage)
      unsubscribeProfile()
    }
  }, [onClose, open, runtime, store])

  if (!open) return null

  return (
    <iframe
      ref={frameRef}
      data-ylc-settings-frame
      src={getSettingsPageUrl()}
      title='YouTube Live Chat Fullscreen settings'
      onLoad={() => {
        store.set(settingsPreviewStateAtom, null)
        postDiagnosticReport()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
        pointerEvents: 'auto',
        zIndex: CONTENT_UI_LAYER.modal,
      }}
    />
  )
}
