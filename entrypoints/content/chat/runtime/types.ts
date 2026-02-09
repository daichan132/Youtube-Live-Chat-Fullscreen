export type ChatMode = 'live' | 'archive' | 'none'

export type IframeLoadState = 'idle' | 'attaching' | 'initializing' | 'ready' | 'error'

export type LiveChatSource = {
  kind: 'live_direct'
  videoId: string
  url: string
}

export type ArchiveChatSource = {
  kind: 'archive_borrow'
  iframe: HTMLIFrameElement
}

export type ChatSource = LiveChatSource | ArchiveChatSource

export type OverlayVisibilityInput = {
  userToggleEnabled: boolean
  isFullscreen: boolean
  fullscreenSourceReady: boolean
  inlineVisible: boolean
  nativeChatOpenIntent: boolean
}
