import { browser, type PublicPath } from 'wxt/browser'
import { SHADOW_HOST_ID, SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'

export type PortalTargets = {
  overlayRoot: ShadowRoot | null
  switchContainer: HTMLElement | null
}

const createOverlayRoot = (player: HTMLElement, contentCssUrl: string) => {
  const stale = document.getElementById(SHADOW_HOST_ID)
  if (stale && stale.parentElement !== player) stale.remove()

  const host = stale?.isConnected ? stale : document.createElement('div')
  if (!host.isConnected) {
    host.id = SHADOW_HOST_ID
    host.style.pointerEvents = 'none'
    host.style.position = 'absolute'
    host.style.inset = '0'
    host.style.width = '100%'
    host.style.height = '100%'
    host.style.zIndex = String(CONTENT_UI_LAYER.overlay)
    host.style.isolation = 'isolate'
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
  const stale = document.getElementById(SWITCH_BUTTON_CONTAINER_ID)
  if (stale && stale.parentElement !== rightControls) stale.remove()

  const container = stale?.isConnected ? stale : document.createElement('div')
  if (!container.isConnected) {
    container.id = SWITCH_BUTTON_CONTAINER_ID
    container.style.height = '100%'
    container.style.width = '54px'
    container.style.display = 'inline-block'
    container.style.verticalAlign = 'top'
    rightControls.prepend(container)
  }
  return container
}

export type PresentationLease = {
  sync(input: {
    player: HTMLElement | null
    rightControls: HTMLElement | null
    overlayEnabled: boolean
    switchEnabled: boolean
  }): PortalTargets
  clear(): void
}

export const createPresentationLease = (): PresentationLease => {
  const contentCssUrl = browser.runtime.getURL('content-scripts/content.css' as PublicPath)
  let overlayRoot: ShadowRoot | null = null
  let switchContainer: HTMLElement | null = null

  const clear = () => {
    overlayRoot?.host.remove()
    switchContainer?.remove()
    overlayRoot = null
    switchContainer = null
  }

  return {
    sync({ player, rightControls, overlayEnabled, switchEnabled }) {
      const overlayCurrent = overlayRoot?.host.isConnected === true && overlayRoot.host.parentElement === player
      if (!overlayEnabled || !player) {
        overlayRoot?.host.remove()
        overlayRoot = null
      } else if (!overlayCurrent) {
        overlayRoot?.host.remove()
        overlayRoot = createOverlayRoot(player, contentCssUrl)
      }

      const switchCurrent = switchContainer?.isConnected === true && switchContainer.parentElement === rightControls
      if (!switchEnabled || !rightControls) {
        switchContainer?.remove()
        switchContainer = null
      } else if (!switchCurrent) {
        switchContainer?.remove()
        switchContainer = createSwitchContainer(rightControls)
      }

      return { overlayRoot, switchContainer }
    },
    clear,
  }
}
