import {
  attachIframeToContainer,
  detachAttachedIframe,
  resolveSourceIframe,
} from '@/entrypoints/content/features/YTDLiveChatIframe/utils/iframeAttachment'
import type { ChatSource } from './types'

export type IframeLease = {
  readonly iframe: HTMLIFrameElement
  readonly videoId: string
  readonly kind: 'borrowed' | 'managed'
  attach(container: HTMLElement): void
  release(options?: { ensureNativeVisible?: boolean }): void
}

const createLease = (iframe: HTMLIFrameElement, videoId: string, kind: IframeLease['kind']): IframeLease => {
  let released = false
  let container: HTMLDivElement | null = null

  return {
    iframe,
    videoId,
    kind,
    attach(nextContainer) {
      if (released) return
      container = nextContainer as HTMLDivElement
      attachIframeToContainer(container, iframe)
    },
    release(options) {
      if (released) return
      released = true
      detachAttachedIframe(iframe, container, options)
      container = null
    },
  }
}

export const createBorrowedIframeLease = (iframe: HTMLIFrameElement, videoId: string): IframeLease =>
  createLease(iframe, videoId, 'borrowed')

export const createManagedIframeLease = (url: string, videoId: string): IframeLease => {
  const iframe = resolveSourceIframe({ kind: 'live_direct', url, videoId }, null)
  return createLease(iframe, videoId, 'managed')
}

export const createIframeLease = (source: ChatSource, videoId: string): IframeLease => {
  if (source.kind === 'live_direct') return createManagedIframeLease(source.url, videoId)
  return createBorrowedIframeLease(source.iframe, videoId)
}
