import { useEffect, useRef } from 'react'
import { browser, type PublicPath } from 'wxt/browser'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { isSettingsFrameMessage, SETTINGS_FRAME_MESSAGE } from './settingsFrameMessages'

type SettingsFrameProps = {
  open: boolean
  onClose: () => void
}

const SETTINGS_PAGE_PATH = 'settings.html' as PublicPath

export const SettingsFrame = ({ open, onClose }: SettingsFrameProps) => {
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!open) return

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || !isSettingsFrameMessage(event.data)) return
      if (event.data.type === SETTINGS_FRAME_MESSAGE.close) onClose()
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onClose, open])

  if (!open) return null

  return (
    <iframe
      ref={frameRef}
      data-ylc-settings-frame
      src={browser.runtime.getURL(SETTINGS_PAGE_PATH)}
      title='YouTube Live Chat Fullscreen settings'
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
