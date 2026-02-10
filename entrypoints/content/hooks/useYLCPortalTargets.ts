import { useEffect, useMemo, useRef, useState } from 'react'
import type { PublicPath } from 'wxt/browser'
import { SHADOW_HOST_ID, SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'

const ensureShadowRoot = (contentCssUrl: string): ShadowRoot | null => {
  const player = document.getElementById('movie_player')
  if (!player) return null

  let host = document.getElementById(SHADOW_HOST_ID)
  if (!host) {
    host = document.createElement('div')
    host.id = SHADOW_HOST_ID
    host.style.pointerEvents = 'none'
    host.style.position = 'absolute'
    host.style.top = '0'
    host.style.left = '0'
    host.style.width = '0'
    host.style.height = '0'
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
    return root
  }
  return host.shadowRoot ?? null
}

const removeShadowRoot = (root: ShadowRoot | null) => {
  if (!root) return
  const host = root.host
  if (host?.parentNode) {
    host.parentNode.removeChild(host)
  }
}

const ensureSwitchButtonContainer = (): HTMLElement | null => {
  const controls = document.getElementById('movie_player')?.getElementsByClassName('ytp-right-controls')[0]
  if (!controls) return null

  let container = document.getElementById(SWITCH_BUTTON_CONTAINER_ID)
  if (!container) {
    container = document.createElement('div')
    container.id = SWITCH_BUTTON_CONTAINER_ID
    container.style.height = '100%'
    container.style.width = '54px'
    // Keep the slot hidden until Content.tsx explicitly enables switch rendering.
    container.style.display = 'none'
    container.style.verticalAlign = 'top'
    controls.prepend(container)
  }
  return container
}

const removeSwitchButtonContainer = (container: HTMLElement | null) => {
  if (!container) return
  if (container.parentNode) {
    container.parentNode.removeChild(container)
  }
}

type PortalTargets = {
  portalsReady: boolean
  shadowRoot: ShadowRoot | null
  switchButtonContainer: HTMLElement | null
}

const initialTargets: PortalTargets = {
  portalsReady: false,
  shadowRoot: null,
  switchButtonContainer: null,
}

export const useYLCPortalTargets = (enabled: boolean) => {
  const shadowRootRef = useRef<ShadowRoot | null>(null)
  const switchButtonRef = useRef<HTMLElement | null>(null)
  const [targets, setTargets] = useState<PortalTargets>(initialTargets)

  const retryIntervalMs = 100
  const retryMaxMs = 5000
  const contentCssUrl = useMemo(() => browser.runtime.getURL('content-scripts/content.css' as PublicPath), [])

  useEffect(() => {
    if (enabled) {
      let interval: number | null = null
      const startedAt = Date.now()

      const ensureTargets = () => {
        if (!shadowRootRef.current) {
          shadowRootRef.current = ensureShadowRoot(contentCssUrl)
        }
        if (!switchButtonRef.current) {
          switchButtonRef.current = ensureSwitchButtonContainer()
        }
        const ready = Boolean(shadowRootRef.current && switchButtonRef.current)
        setTargets({
          portalsReady: ready,
          shadowRoot: shadowRootRef.current,
          switchButtonContainer: switchButtonRef.current,
        })
        return ready
      }

      if (!ensureTargets()) {
        interval = window.setInterval(() => {
          const ready = ensureTargets()
          if (ready) {
            if (interval) window.clearInterval(interval)
            interval = null
            return
          }
          if (Date.now() - startedAt >= retryMaxMs) {
            if (interval) window.clearInterval(interval)
            interval = null
          }
        }, retryIntervalMs)
      }

      return () => {
        if (interval) window.clearInterval(interval)
      }
    }

    removeShadowRoot(shadowRootRef.current)
    removeSwitchButtonContainer(switchButtonRef.current)
    shadowRootRef.current = null
    switchButtonRef.current = null
    setTargets(initialTargets)
  }, [contentCssUrl, enabled])

  return targets
}
