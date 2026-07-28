type YouTubeScenarioVideoBase = {
  id: string
  title: string
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

type YouTubeScenarioBase = {
  page: YouTubeScenarioPage
  fullscreen: boolean
}

export type YouTubeScenarioState = YouTubeScenarioBase &
  (
    | {
        video: YouTubeScenarioVideoBase & { mode: 'live' }
        chat: {
          mode: 'live'
          native: NativeChatDefinition
          response: 'playable' | 'unavailable'
        }
      }
    | {
        video: YouTubeScenarioVideoBase & { mode: 'archive' }
        chat: {
          mode: 'archive'
          native: NativeChatDefinition
          response: 'playable' | 'unavailable'
        }
      }
    | {
        video: YouTubeScenarioVideoBase & { mode: 'ordinary' }
        chat: { mode: 'none' }
      }
  )

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
