import React from 'react'
import { createRoot } from 'react-dom/client'
import { YTDLiveChatSetting } from '@/entrypoints/content/features/YTDLiveChatSetting/components/YTDLiveChatSetting'
import { SETTINGS_FRAME_MESSAGE } from '@/entrypoints/content/settings/settingsFrameMessages'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import './main.css'

const main = async () => {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Settings root was not found')

  const runtime = await createAppRuntime()
  const root = createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <AppProvider runtime={runtime}>
        <YTDLiveChatSetting
          open
          onOpenChange={open => {
            if (!open) window.parent.postMessage({ type: SETTINGS_FRAME_MESSAGE.close }, '*')
          }}
        />
      </AppProvider>
    </React.StrictMode>,
  )

  window.addEventListener(
    'pagehide',
    () => {
      root.unmount()
      runtime.dispose()
    },
    { once: true },
  )
}

void main()
