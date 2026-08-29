import { useEffect, useState } from 'react'
import type { SanitizedDiagnosticReport } from '@/entrypoints/content/diagnostics/sanitizeDiagnosticReport'
import { YTDLiveChatSetting } from '@/entrypoints/content/features/YTDLiveChatSetting/components/YTDLiveChatSetting'
import {
  isSettingsFrameReport,
  SETTINGS_FRAME_MESSAGE,
  type SettingsFrameRequest,
} from '@/entrypoints/content/settings/settingsFrameMessages'
import { mountExtensionPage } from '@/shared/runtime/mountExtensionPage'
import { getAllowedParentOrigin, isTrustedParentMessage } from './parentBridge'
import { RuntimeDiagnosticsPanel } from './RuntimeDiagnosticsPanel'
import './main.css'

const getParentOrigin = () => getAllowedParentOrigin(location.href)

const postToParent = (message: SettingsFrameRequest) => {
  const parentOrigin = getParentOrigin()
  if (parentOrigin && window.parent !== window) window.parent.postMessage(message, parentOrigin)
}

const SettingsApp = () => {
  const [report, setReport] = useState<SanitizedDiagnosticReport | null>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const parentOrigin = getParentOrigin()
      if (parentOrigin && isTrustedParentMessage(event, parentOrigin, window.parent) && isSettingsFrameReport(event.data))
        setReport(event.data.report)
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

void mountExtensionPage(<SettingsApp />)
