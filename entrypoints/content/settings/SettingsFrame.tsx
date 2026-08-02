import { useEffect, useRef } from 'react'
import { browser, type PublicPath } from 'wxt/browser'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import type { ChatRuntime } from '../runtime/ChatRuntime'
import { isSettingsFrameRequest, SETTINGS_FRAME_MESSAGE } from './settingsFrameMessages'

type SettingsFrameProps = {
  open: boolean
  onClose: () => void
  runtime: Pick<ChatRuntime, 'getDiagnosticReport' | 'restart' | 'subscribe'>
}

const SETTINGS_PAGE_PATH = 'settings.html' as PublicPath
const settingsPageUrl = new URL(browser.runtime.getURL('/'))
const SETTINGS_PAGE_ORIGIN = `${settingsPageUrl.protocol}//${settingsPageUrl.host}`

export const SettingsFrame = ({ open, onClose, runtime }: SettingsFrameProps) => {
  const frameRef = useRef<HTMLIFrameElement>(null)

  const postDiagnosticReport = () => {
    frameRef.current?.contentWindow?.postMessage(
      { type: SETTINGS_FRAME_MESSAGE.diagnosticsReport, report: runtime.getDiagnosticReport() },
      SETTINGS_PAGE_ORIGIN,
    )
  }

  useEffect(() => {
    if (!open) return

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || !isSettingsFrameRequest(event.data)) return
      if (event.data.type === SETTINGS_FRAME_MESSAGE.close) onClose()
      if (event.data.type === SETTINGS_FRAME_MESSAGE.diagnosticsRequest) postDiagnosticReport()
      if (event.data.type === SETTINGS_FRAME_MESSAGE.runtimeRestart) {
        runtime.restart()
        postDiagnosticReport()
      }
    }

    window.addEventListener('message', handleMessage)
    const unsubscribe = runtime.subscribe(postDiagnosticReport)
    return () => {
      window.removeEventListener('message', handleMessage)
      unsubscribe()
    }
  }, [onClose, open, runtime])

  if (!open) return null

  return (
    <iframe
      ref={frameRef}
      data-ylc-settings-frame
      src={browser.runtime.getURL(SETTINGS_PAGE_PATH)}
      title='YouTube Live Chat Fullscreen settings'
      onLoad={postDiagnosticReport}
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
