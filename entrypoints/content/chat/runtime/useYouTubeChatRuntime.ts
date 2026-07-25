import { useEffect, useRef, useState } from 'react'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { readYouTubeChatSnapshot, type YouTubeChatSnapshot } from './readYouTubeChatSnapshot'
import type { ChatMode } from './types'

export type YouTubeChatRuntime = {
  videoId: string | null
  mode: ChatMode
  canShowSwitch: boolean
  sourceReady: boolean
  terminallyUnavailable: boolean
  revision: number
}

type AvailabilityLatch = {
  videoId: string | null
  mode: ChatMode
  canShowSwitch: boolean
  sourceReady: boolean
}

const FALLBACK_CHECK_INTERVAL_MS = 1000
const CHAT_BOUNDARY_SELECTOR = 'ytd-live-chat-frame, #chatframe, #chat-container, #show-hide-button, #secondary'

const mutationTouchesChatBoundary = (mutation: MutationRecord) => {
  const isRelevantElement = (node: Node) =>
    node instanceof Element &&
    (node.matches(CHAT_BOUNDARY_SELECTOR) ||
      node.closest(CHAT_BOUNDARY_SELECTOR) !== null ||
      node.querySelector(CHAT_BOUNDARY_SELECTOR) !== null)

  if (mutation.type === 'attributes') return isRelevantElement(mutation.target)
  return [...mutation.addedNodes, ...mutation.removedNodes].some(isRelevantElement)
}

const createRuntime = (snapshot: YouTubeChatSnapshot, latch: AvailabilityLatch, revision: number): YouTubeChatRuntime => {
  if (latch.videoId !== snapshot.videoId || latch.mode !== snapshot.mode) {
    latch.videoId = snapshot.videoId
    latch.mode = snapshot.mode
    latch.canShowSwitch = false
    latch.sourceReady = false
  }

  if (snapshot.terminallyUnavailable || snapshot.mode === 'none' || !snapshot.videoId) {
    latch.canShowSwitch = false
    latch.sourceReady = false
  } else {
    if (snapshot.mode === 'live' && snapshot.canShowSwitch) latch.canShowSwitch = true
    if (snapshot.sourceReady) latch.sourceReady = true
  }

  return {
    videoId: snapshot.videoId,
    mode: snapshot.mode,
    canShowSwitch: snapshot.mode === 'live' ? latch.canShowSwitch : snapshot.canShowSwitch,
    sourceReady: latch.sourceReady,
    terminallyUnavailable: snapshot.terminallyUnavailable,
    revision,
  }
}

const isSameRuntimeSnapshot = (current: YouTubeChatRuntime, next: YouTubeChatRuntime) =>
  current.videoId === next.videoId &&
  current.mode === next.mode &&
  current.canShowSwitch === next.canShowSwitch &&
  current.sourceReady === next.sourceReady &&
  current.terminallyUnavailable === next.terminallyUnavailable

export const useYouTubeChatRuntime = (): YouTubeChatRuntime => {
  const latchRef = useRef<AvailabilityLatch>({
    videoId: null,
    mode: 'none',
    canShowSwitch: false,
    sourceReady: false,
  })
  const [runtime, setRuntime] = useState(() =>
    createRuntime(readYouTubeChatSnapshot(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId), latchRef.current, 0),
  )

  useEffect(() => {
    let animationFrame: number | null = null
    let forceRevisionOnScheduledSync = false

    const sync = (forceRevision = false) => {
      const store = useYTDLiveChatNoLsStore.getState()
      const snapshot = readYouTubeChatSnapshot(store.unavailableLiveChatVideoId)

      if (store.unavailableLiveChatVideoId && store.unavailableLiveChatVideoId !== snapshot.videoId) {
        store.setUnavailableLiveChatVideoId(null)
      }
      if (
        snapshot.detectedUnavailableVideoId &&
        snapshot.detectedUnavailableVideoId === snapshot.videoId &&
        store.unavailableLiveChatVideoId !== snapshot.videoId
      ) {
        store.setUnavailableLiveChatVideoId(snapshot.videoId)
      }

      setRuntime(current => {
        const next = createRuntime(snapshot, latchRef.current, current.revision)
        if (isSameRuntimeSnapshot(current, next) && !forceRevision) return current
        return { ...next, revision: current.revision + 1 }
      })
    }

    const scheduleSync = (forceRevision = false) => {
      forceRevisionOnScheduledSync ||= forceRevision
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null
        const shouldForceRevision = forceRevisionOnScheduledSync
        forceRevisionOnScheduledSync = false
        sync(shouldForceRevision)
      })
    }

    sync()
    const interval = window.setInterval(() => sync(), FALLBACK_CHECK_INTERVAL_MS)
    const observer = new MutationObserver(mutations => {
      if (mutations.some(mutationTouchesChatBoundary)) scheduleSync(true)
    })
    const observerTarget = document.body ?? document.documentElement
    observer.observe(observerTarget, {
      attributes: true,
      attributeFilter: ['aria-hidden', 'hidden', 'src', 'video-id'],
      childList: true,
      subtree: true,
    })
    const handleNavigate = () => scheduleSync(true)
    document.addEventListener('yt-navigate-finish', handleNavigate)
    const unsubscribe = useYTDLiveChatNoLsStore.subscribe((state, previousState) => {
      if (state.unavailableLiveChatVideoId !== previousState.unavailableLiveChatVideoId) scheduleSync()
    })

    return () => {
      window.clearInterval(interval)
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      observer.disconnect()
      document.removeEventListener('yt-navigate-finish', handleNavigate)
      unsubscribe()
    }
  }, [])

  return runtime
}
