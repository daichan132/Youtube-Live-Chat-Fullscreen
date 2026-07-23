export type ChatMode = 'live' | 'archive' | 'none'

export type LiveDirectChatSource = {
  kind: 'live_direct'
  videoId: string
  url: string
}

export type LiveBorrowChatSource = {
  kind: 'live_borrow'
  videoId: string
  iframe: HTMLIFrameElement
}

export type LiveChatSource = LiveDirectChatSource | LiveBorrowChatSource

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
