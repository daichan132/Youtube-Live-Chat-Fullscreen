import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { SanitizedDiagnosticReport } from '@/entrypoints/content/diagnostics/sanitizeDiagnosticReport'
import { YTDLiveChatSetting } from '@/entrypoints/content/features/YTDLiveChatSetting/components/YTDLiveChatSetting'
import {
  isSettingsFrameReport,
  SETTINGS_FRAME_MESSAGE,
  type SettingsFrameRequest,
} from '@/entrypoints/content/settings/settingsFrameMessages'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { RuntimeDiagnosticsPanel } from './RuntimeDiagnosticsPanel'
import './main.css'

const getParentOrigin = () => {
  try {
    return new URL(document.referrer).origin
  } catch {
    return '*'
  }
}

const postToParent = (message: SettingsFrameRequest) => window.parent.postMessage(message, getParentOrigin())

const SettingsApp = () => {
  const [report, setReport] = useState<SanitizedDiagnosticReport | null>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source === window.parent && isSettingsFrameReport(event.data)) setReport(event.data.report)
    }
    window.addEventListener('message', handleMessage)
    postToParent({ type: SETTINGS_FRAME_MESSAGE.diagnosticsRequest })
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <YTDLiveChatSetting
      open
      diagnostics={
        <RuntimeDiagnosticsPanel report={report} onRestart={() => postToParent({ type: SETTINGS_FRAME_MESSAGE.runtimeRestart })} />
      }
      onOpenChange={open => {
        if (!open) postToParent({ type: SETTINGS_FRAME_MESSAGE.close })
      }}
    />
  )
}

const main = async () => {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Settings root was not found')

  const runtime = await createAppRuntime()
  const root = createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <AppProvider runtime={runtime}>
        <SettingsApp />
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
