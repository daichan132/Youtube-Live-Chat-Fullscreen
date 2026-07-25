import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { browser, type PublicPath } from 'wxt/browser'
import { SHADOW_HOST_ID, SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'

type UseYLCPortalTargetsOptions = {
  overlayEnabled: boolean
  switchEnabled: boolean
}

type PortalTargets = {
  overlayRoot: ShadowRoot | null
  switchContainer: HTMLElement | null
}

const initialTargets: PortalTargets = {
  overlayRoot: null,
  switchContainer: null,
}

const getCurrentPlayer = () => document.getElementById('movie_player')

const getCurrentRightControls = (player: HTMLElement | null) =>
  player?.getElementsByClassName('ytp-right-controls')[0] as HTMLElement | undefined

const createOverlayRoot = (player: HTMLElement, contentCssUrl: string) => {
  const existingHost = document.getElementById(SHADOW_HOST_ID)
  if (existingHost && existingHost.parentElement !== player) {
    existingHost.remove()
  }

  const host = existingHost?.isConnected ? existingHost : document.createElement('div')
  if (!host.isConnected) {
    host.id = SHADOW_HOST_ID
    host.style.pointerEvents = 'none'
    host.style.position = 'absolute'
    host.style.inset = '0'
    host.style.width = '100%'
    host.style.height = '100%'
    host.style.zIndex = String(CONTENT_UI_LAYER.overlay)
    host.style.isolation = 'isolate'
    // Brave needs an explicit compositor surface to keep the chat above video.
    // Firefox must retain its native video surface to avoid HDR color changes.
    host.style.transform = import.meta.env.FIREFOX ? '' : 'translateZ(0)'

    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>
  :host {
    display: block;
    font-size: 14px;
    line-height: 1.4;
    color: #0f172a;
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans",
      sans-serif;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  :host, :host *, :host *::before, :host *::after {
    box-sizing: border-box;
  }
</style>`

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = contentCssUrl
    root.appendChild(link)
    player.appendChild(host)
  }

  return host.shadowRoot
}

const createSwitchContainer = (rightControls: HTMLElement) => {
  const existingContainer = document.getElementById(SWITCH_BUTTON_CONTAINER_ID)
  if (existingContainer && existingContainer.parentElement !== rightControls) {
    existingContainer.remove()
  }

  const container = existingContainer?.isConnected ? existingContainer : document.createElement('div')
  if (!container.isConnected) {
    container.id = SWITCH_BUTTON_CONTAINER_ID
    container.style.height = '100%'
    container.style.width = '54px'
    container.style.display = 'none'
    container.style.verticalAlign = 'top'
    rightControls.prepend(container)
  }

  return container
}

const mutationTouchesPortalBoundary = (mutation: MutationRecord) => {
  if (mutation.type !== 'childList') return false

  const isRelevant = (node: Node) => {
    if (!(node instanceof Element)) return false
    return Boolean(
      node.matches(`#movie_player, .ytp-right-controls, #${SHADOW_HOST_ID}, #${SWITCH_BUTTON_CONTAINER_ID}`) ||
        node.querySelector(`#movie_player, .ytp-right-controls, #${SHADOW_HOST_ID}, #${SWITCH_BUTTON_CONTAINER_ID}`),
    )
  }

  return [...mutation.addedNodes, ...mutation.removedNodes].some(isRelevant)
}

export const useYLCPortalTargets = ({ overlayEnabled, switchEnabled }: UseYLCPortalTargetsOptions): PortalTargets => {
  const overlayRootRef = useRef<ShadowRoot | null>(null)
  const switchContainerRef = useRef<HTMLElement | null>(null)
  const [targets, setTargets] = useState<PortalTargets>(initialTargets)
  const contentCssUrl = useMemo(() => browser.runtime.getURL('content-scripts/content.css' as PublicPath), [])

  const syncTargets = useCallback(() => {
    const player = getCurrentPlayer()
    const rightControls = getCurrentRightControls(player) ?? null

    const overlayIsCurrent = overlayRootRef.current?.host.isConnected === true && overlayRootRef.current.host.parentElement === player
    if (!overlayEnabled || !player) {
      overlayRootRef.current?.host.remove()
      overlayRootRef.current = null
    } else if (!overlayIsCurrent) {
      overlayRootRef.current?.host.remove()
      overlayRootRef.current = createOverlayRoot(player, contentCssUrl)
    }

    const switchIsCurrent = switchContainerRef.current?.isConnected === true && switchContainerRef.current.parentElement === rightControls
    if (!switchEnabled || !rightControls) {
      switchContainerRef.current?.remove()
      switchContainerRef.current = null
    } else if (!switchIsCurrent) {
      switchContainerRef.current?.remove()
      switchContainerRef.current = createSwitchContainer(rightControls)
    }

    setTargets(current => {
      if (current.overlayRoot === overlayRootRef.current && current.switchContainer === switchContainerRef.current) {
        return current
      }
      return {
        overlayRoot: overlayRootRef.current,
        switchContainer: switchContainerRef.current,
      }
    })

    return {
      overlayResolved: !overlayEnabled || overlayRootRef.current !== null,
      switchResolved: !switchEnabled || switchContainerRef.current !== null,
    }
  }, [contentCssUrl, overlayEnabled, switchEnabled])

  useEffect(() => {
    let retryTimer: number | null = null
    let animationFrame: number | null = null

    const stopRetryWhenResolved = () => {
      const resolved = syncTargets()
      if (resolved.overlayResolved && resolved.switchResolved && retryTimer !== null) {
        window.clearInterval(retryTimer)
        retryTimer = null
      }
    }

    const scheduleSync = () => {
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null
        stopRetryWhenResolved()
      })
    }

    stopRetryWhenResolved()
    const initialResolved = {
      overlay: !overlayEnabled || overlayRootRef.current !== null,
      switch: !switchEnabled || switchContainerRef.current !== null,
    }
    if (!initialResolved.overlay || !initialResolved.switch) {
      retryTimer = window.setInterval(stopRetryWhenResolved, 250)
    }

    const observer = new MutationObserver(mutations => {
      if (mutations.some(mutationTouchesPortalBoundary)) scheduleSync()
    })
    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true })
    }

    document.addEventListener('fullscreenchange', scheduleSync)
    document.addEventListener('yt-navigate-finish', scheduleSync)

    return () => {
      if (retryTimer !== null) window.clearInterval(retryTimer)
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      observer.disconnect()
      document.removeEventListener('fullscreenchange', scheduleSync)
      document.removeEventListener('yt-navigate-finish', scheduleSync)
    }
  }, [overlayEnabled, switchEnabled, syncTargets])

  useEffect(
    () => () => {
      overlayRootRef.current?.host.remove()
      switchContainerRef.current?.remove()
      overlayRootRef.current = null
      switchContainerRef.current = null
    },
    [],
  )

  return targets
}
