export type LiveDirectChatSource = {
  kind: 'live_direct'
  url: string
}

export type LiveBorrowChatSource = {
  kind: 'live_borrow'
  iframe: HTMLIFrameElement
}

export type ArchiveChatSource = {
  kind: 'archive_borrow'
  iframe: HTMLIFrameElement
}

export type ChatSource = LiveDirectChatSource | LiveBorrowChatSource | ArchiveChatSource
