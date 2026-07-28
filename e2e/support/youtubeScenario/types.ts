export type YouTubeScenarioVideo = {
  id: string
  title: string
  mode: 'live' | 'archive' | 'ordinary'
}

export type YouTubeScenarioPage = {
  chatContainer: 'present' | 'absent'
  chatDimensions?: 'standard'
}

export type NativeChatSlot = {
  beforeId: string
  afterId: string
}

export type NativeChatDefinition = {
  state: 'absent' | 'playable' | 'unavailable'
  showHideControl?: boolean
  slot?: NativeChatSlot
  hostVideoId?: boolean
}

export type YouTubeScenarioChat =
  | { mode: 'none' }
  | {
      mode: 'live' | 'archive'
      native: NativeChatDefinition
      response: 'playable' | 'unavailable'
    }

export type YouTubeScenarioState = {
  video: YouTubeScenarioVideo
  page: YouTubeScenarioPage
  fullscreen: boolean
  chat: YouTubeScenarioChat
}

export type NativeIframeMutation = {
  mode: 'live' | 'archive'
  state: 'playable' | 'unavailable'
  hostVideoId?: boolean
}

export type ExtensionIframeIdentity = {
  id: string | null
  owned: string | null
  source: string | null
  managedCount: number
  nativeCount: number
}

export type NativeSlotObservation = {
  restored: boolean
  attached: string | null
  children: string[]
}

export type ScenarioRuntimeObservation = {
  shadowHostCount: number
  switchContainerCount: number
  switchCount: number
  nativeUnavailable: boolean
  nativePlayable: boolean
  nativeControls: boolean
  extensionOverlayRendered: boolean
  extensionChatLoaded: boolean
}
