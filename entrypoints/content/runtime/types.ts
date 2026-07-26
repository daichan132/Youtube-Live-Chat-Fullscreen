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

export type ArchiveChatSource = {
  kind: 'archive_borrow'
  iframe: HTMLIFrameElement
}

export type ChatSource = LiveDirectChatSource | LiveBorrowChatSource | ArchiveChatSource
