import {
  createIframeAttachment,
  createManagedLiveIframe,
  type IframeAttachmentState,
} from '@/entrypoints/content/features/YTDLiveChatIframe/utils/iframeAttachment'
import type { PageTargets } from '../../platform/youtube/types'
import type { ChatSource } from '../types'

export type ChatIframeLease = {
  readonly generation: number
  readonly iframe: HTMLIFrameElement
  readonly videoId: string
  readonly kind: 'borrowed-live' | 'borrowed-replay' | 'managed-live'
  readonly ownership: 'borrowed' | 'managed'
  readonly state: IframeAttachmentState
  setBorrowedMode(mode: 'live' | 'replay'): void
  attach(container: HTMLElement): void
  captureDocumentStyle(): boolean
  reconcile(targets?: PageTargets | null): void
  release(options?: { ensureNativeVisible?: boolean }, targets?: PageTargets | null): void
  abandonRestore(): void
}

const createLease = (iframe: HTMLIFrameElement, videoId: string, kind: ChatIframeLease['kind'], generation: number): ChatIframeLease => {
  const attachment = createIframeAttachment(iframe, videoId)
  let currentKind = kind
  return {
    generation,
    iframe,
    videoId,
    get kind() {
      return currentKind
    },
    ownership: kind === 'managed-live' ? 'managed' : 'borrowed',
    setBorrowedMode(mode) {
      if (kind !== 'managed-live') currentKind = mode === 'live' ? 'borrowed-live' : 'borrowed-replay'
    },
    get state() {
      return attachment.state
    },
    attach: container => attachment.attach(container),
    captureDocumentStyle: () => attachment.captureDocumentStyle(),
    reconcile: targets => attachment.reconcile(targets),
    release: (options, targets) => attachment.release(options, targets),
    abandonRestore: () => attachment.abandonRestore(),
  }
}

export const createBorrowedIframeLease = (
  iframe: HTMLIFrameElement,
  videoId: string,
  mode: 'live' | 'replay' = 'live',
  generation = 0,
): ChatIframeLease => createLease(iframe, videoId, mode === 'live' ? 'borrowed-live' : 'borrowed-replay', generation)

export const createManagedIframeLease = (url: string, videoId: string, generation = 0): ChatIframeLease =>
  createLease(createManagedLiveIframe(url), videoId, 'managed-live', generation)

export const createIframeLease = (source: ChatSource, videoId: string, generation = 0): ChatIframeLease => {
  switch (source.kind) {
    case 'live_direct':
      return createManagedIframeLease(source.url, videoId, generation)
    case 'live_borrow':
      return createBorrowedIframeLease(source.iframe, videoId, 'live', generation)
    case 'archive_borrow':
      return createBorrowedIframeLease(source.iframe, videoId, 'replay', generation)
    default: {
      const unhandled: never = source
      void unhandled
      throw new Error('Unsupported chat source')
    }
  }
}
