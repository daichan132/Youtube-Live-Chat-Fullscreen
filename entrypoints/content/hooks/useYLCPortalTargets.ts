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
  :host { font-size: 14px }
  div   { font-size: 14px }
  p     { font-size: 14px }
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
    container.style.display = 'inline-block'
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

export const useYLCPortalTargets = (enabled: boolean) => {
  const shadowRootRef = useRef<ShadowRoot | null>(null)
  const switchButtonRef = useRef<HTMLElement | null>(null)
  const [portalsReady, setPortalsReady] = useState(false)

  const contentCssUrl = useMemo(() => browser.runtime.getURL('content-scripts/content.css' as PublicPath), [])

  useEffect(() => {
    if (enabled) {
      shadowRootRef.current = ensureShadowRoot(contentCssUrl)
      switchButtonRef.current = ensureSwitchButtonContainer()
      setPortalsReady(true)
      return
    }

    removeShadowRoot(shadowRootRef.current)
    removeSwitchButtonContainer(switchButtonRef.current)
    shadowRootRef.current = null
    switchButtonRef.current = null
    setPortalsReady(false)
  }, [contentCssUrl, enabled])

  return {
    portalsReady,
    shadowRoot: shadowRootRef.current,
    switchButtonContainer: switchButtonRef.current,
  }
}
