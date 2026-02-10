const SHADOW_HOST_ID = 'shadow-root-live-chat'
const SHADOW_STYLE_MARKER_ATTR = 'data-ylc-storybook-shadow-style'
const SHADOW_HEAD_STYLE_CLONE_ATTR = 'data-ylc-storybook-shadow-head-style'
const SHADOW_BASE_STYLES = `
:host { font-size: 14px; }
div { font-size: 14px; }
p { font-size: 14px; }
`

const applyHostStyles = (host: HTMLElement) => {
  host.style.pointerEvents = 'none'
  host.style.position = 'absolute'
  host.style.top = '0'
  host.style.left = '0'
  host.style.width = '0'
  host.style.height = '0'
}

const ensureShadowRootStyles = (shadowRoot: ShadowRoot) => {
  if (!shadowRoot.querySelector(`style[${SHADOW_STYLE_MARKER_ATTR}="true"]`)) {
    const baseStyle = document.createElement('style')
    baseStyle.setAttribute(SHADOW_STYLE_MARKER_ATTR, 'true')
    baseStyle.textContent = SHADOW_BASE_STYLES
    shadowRoot.append(baseStyle)
  }

  shadowRoot.querySelectorAll(`[${SHADOW_HEAD_STYLE_CLONE_ATTR}="true"]`).forEach(node => node.remove())

  const styleSources = document.head.querySelectorAll('style, link[rel="stylesheet"]')
  styleSources.forEach(source => {
    const clone = source.cloneNode(true) as HTMLElement
    clone.setAttribute(SHADOW_HEAD_STYLE_CLONE_ATTR, 'true')
    shadowRoot.append(clone)
  })
}

export const ensureYouTubeDomScaffold = () => {
  const existingYouTubeApp = document.querySelector('ytd-app')
  if (!existingYouTubeApp) {
    document.body.append(document.createElement('ytd-app'))
  }

  const host = document.getElementById(SHADOW_HOST_ID) ?? document.createElement('div')
  if (!host.id) {
    host.id = SHADOW_HOST_ID
    document.body.append(host)
  }
  applyHostStyles(host)

  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
  ensureShadowRootStyles(shadowRoot)
}
