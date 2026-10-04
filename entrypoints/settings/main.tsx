import { YTDLiveChatSetting } from '@/entrypoints/content/features/YTDLiveChatSetting/components/YTDLiveChatSetting'
import { SETTINGS_FRAME_MESSAGE, type SettingsFrameRequest } from '@/entrypoints/content/settings/settingsFrameMessages'
import { mountExtensionPage } from '@/shared/runtime/mountExtensionPage'
import { getAllowedParentOrigin } from './parentBridge'
import { useSettingsStylePreview } from './useSettingsStylePreview'
import './main.css'

const getParentOrigin = () => getAllowedParentOrigin(location.href)

const postToParent = (message: SettingsFrameRequest) => {
  const parentOrigin = getParentOrigin()
  if (parentOrigin && window.parent !== window) window.parent.postMessage(message, parentOrigin)
}

const SettingsApp = () => {
  useSettingsStylePreview(postToParent)
  return (
    <YTDLiveChatSetting
      open
      onOpenChange={open => {
        if (!open) postToParent({ type: SETTINGS_FRAME_MESSAGE.close })
      }}
    />
  )
}

void mountExtensionPage(<SettingsApp />)
