import { SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'

type YouTubeLiveChatFrameElement = HTMLElement & {
  onShowHideChat?: () => void
}

const nativeChatTriggerSelectors =
  '#chat-container, ytd-live-chat-frame, ytd-live-chat-frame #show-hide-button, ytd-live-chat-frame #close-button, #show-hide-button, #close-button'

const archivePlayerChatToggleSelectors = [
  '.ytp-right-controls toggle-button-view-model button[aria-pressed="false"]',
  '.ytp-right-controls button-view-model button[aria-pressed="false"]',
  '#movie_player toggle-button-view-model button[aria-pressed="false"]',
  '#movie_player button-view-model button[aria-pressed="false"]',
  'toggle-button-view-model button[aria-pressed="false"]',
  'button-view-model button[aria-pressed="false"]',
]

const archiveSidebarOpenSelectors = [
  'ytd-live-chat-frame #show-hide-button button',
  'ytd-live-chat-frame #show-hide-button yt-icon-button',
  'ytd-live-chat-frame #show-hide-button tp-yt-paper-icon-button',
  '#chat-container #show-hide-button button',
  '#chat-container #show-hide-button yt-icon-button',
  '#chat-container #show-hide-button tp-yt-paper-icon-button',
  'ytd-live-chat-frame #show-hide-button',
  '#chat-container #show-hide-button',
]

const isNativeChatMarkedExpanded = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(watchFlexy?.hasAttribute('live-chat-present-and-expanded') || watchGrid?.hasAttribute('live-chat-present-and-expanded'))
}

const getNativeChatHref = () => {
  const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
  if (!chatFrame) return ''
  try {
    const docHref = chatFrame.contentDocument?.location?.href ?? ''
    if (docHref) return docHref
  } catch {
    // Ignore and fallback to src attributes.
  }
  return chatFrame.getAttribute('src') ?? chatFrame.src ?? ''
}

const isNativeChatIframeBlank = () => {
  const href = getNativeChatHref()
  if (!href) return true
  return href.includes('about:blank')
}

const isElementDisabled = (element: HTMLElement) => {
  if (element instanceof HTMLButtonElement) return element.disabled
  return element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true'
}

const isElementHiddenByStyle = (element: HTMLElement) => {
  let current: HTMLElement | null = element
  while (current) {
    if (current.hasAttribute('hidden')) return true
    if (current.getAttribute('aria-hidden') === 'true') return true

    const style = window.getComputedStyle(current)
    if (style.display === 'none' || style.visibility === 'hidden') return true
    if (style.pointerEvents === 'none' && current === element) return true

    current = current.parentElement
  }
  return false
}

const isRenderedForUser = (element: HTMLElement) => {
  if (isElementHiddenByStyle(element)) return false
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom')) return true
  return element.getClientRects().length > 0
}

const resolveClickable = (target: HTMLElement) =>
  target.matches('button, yt-icon-button, tp-yt-paper-icon-button, [role="button"]')
    ? target
    : (target.querySelector<HTMLElement>('button, yt-icon-button, tp-yt-paper-icon-button, [role="button"]') ?? target)

const getButtonLabelText = (element: HTMLElement) =>
  `${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('title') ?? ''} ${element.getAttribute('data-title-no-tooltip') ?? ''} ${element.getAttribute('data-tooltip-text') ?? ''}`.toLowerCase()

const isChatLabel = (label: string) => label.includes('chat') || label.includes('チャット')

const clickElement = (element: HTMLElement) => {
  if (typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
  }

  const dispatchMouseEvent = (type: 'mousedown' | 'mouseup' | 'click', buttons: number) => {
    element.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        buttons,
      }),
    )
  }

  const dispatchPointerEvent = (type: 'pointerdown' | 'pointerup', buttons: number) => {
    if (typeof PointerEvent === 'undefined') return
    element.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        buttons,
        pointerType: 'mouse',
        isPrimary: true,
      }),
    )
  }

  dispatchPointerEvent('pointerdown', 1)
  dispatchMouseEvent('mousedown', 1)
  element.click()
  dispatchPointerEvent('pointerup', 0)
  dispatchMouseEvent('mouseup', 0)
  dispatchMouseEvent('click', 0)
}

const tryClickBySelector = (
  selector: string,
  {
    requireVisible = true,
    requireChatLabel = false,
    allowDisabled = false,
  }: {
    requireVisible?: boolean
    requireChatLabel?: boolean
    allowDisabled?: boolean
  } = {},
) => {
  const targets = Array.from(document.querySelectorAll<HTMLElement>(selector))
  if (targets.length === 0) return false

  for (const target of targets) {
    const clickable = resolveClickable(target)
    if (!allowDisabled && isElementDisabled(clickable)) continue
    if (requireVisible && !isRenderedForUser(clickable)) continue
    if (requireChatLabel && !isChatLabel(getButtonLabelText(clickable))) continue

    clickElement(clickable)
    return true
  }

  return false
}

const clickFirstMatchingSelector = (
  selectors: string[],
  options?: {
    requireVisible?: boolean
    requireChatLabel?: boolean
    allowDisabled?: boolean
  },
) => {
  for (const selector of selectors) {
    if (tryClickBySelector(selector, options)) return selector
  }
  return null
}

const revealPlayerControls = () => {
  const moviePlayer = document.getElementById('movie_player') as HTMLElement | null
  if (!moviePlayer) return

  const dispatch = (type: 'mousemove' | 'mouseover' | 'mouseenter') => {
    moviePlayer.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    )
  }

  dispatch('mouseover')
  dispatch('mousemove')
  dispatch('mouseenter')
}

const tryInvokeChatFrameShowHide = () => {
  const host = document.querySelector('ytd-live-chat-frame') as YouTubeLiveChatFrameElement | null
  if (!host) return null
  if (typeof host.onShowHideChat !== 'function') return null
  host.onShowHideChat()
  return 'ytd-live-chat-frame#onShowHideChat'
}

export const openArchiveNativeChatPanel = () => {
  revealPlayerControls()

  // `#show-hide-button` is a toggle. If YouTube already marks expanded and
  // iframe is non-blank, avoid toggling it closed by mistake.
  if (isNativeChatMarkedExpanded() && !isNativeChatIframeBlank()) {
    return null
  }

  const sidebarSelector = clickFirstMatchingSelector(archiveSidebarOpenSelectors, {
    requireVisible: true,
    allowDisabled: true,
  })
  if (sidebarSelector) return sidebarSelector

  const hiddenSidebarSelector = clickFirstMatchingSelector(archiveSidebarOpenSelectors, {
    requireVisible: false,
    allowDisabled: true,
  })
  if (hiddenSidebarSelector) return `${hiddenSidebarSelector} (force)`

  const hostMethodSelector = tryInvokeChatFrameShowHide()
  if (hostMethodSelector) return hostMethodSelector

  const playerToggleSelector = clickFirstMatchingSelector(archivePlayerChatToggleSelectors, {
    requireVisible: true,
    requireChatLabel: true,
  })
  if (playerToggleSelector) return playerToggleSelector

  const hiddenPlayerToggleSelector = clickFirstMatchingSelector(archivePlayerChatToggleSelectors, {
    requireVisible: false,
    requireChatLabel: true,
  })
  if (hiddenPlayerToggleSelector) return `${hiddenPlayerToggleSelector} (force)`

  return null
}

export const openNativeChatPanel = () => openArchiveNativeChatPanel()

const hasChatOnPage = () => Boolean(document.querySelector('ytd-live-chat-frame') || document.querySelector('#chat-container'))

export const isNativeChatToggleButton = (element: HTMLElement) => {
  const button = element.closest('button')
  if (!button) return false

  if (button.closest(`#${SWITCH_BUTTON_CONTAINER_ID}`)) return false

  const isSidebarToggle = Boolean(button.closest('ytd-live-chat-frame #show-hide-button, ytd-live-chat-frame #close-button'))
  if (isSidebarToggle) return true

  const isPlayerControls = Boolean(button.closest('.ytp-right-controls'))
  if (isPlayerControls) {
    const isToggleViewModel = Boolean(button.closest('toggle-button-view-model, button-view-model'))
    if (isToggleViewModel) return true

    const label = getButtonLabelText(button)
    if (isChatLabel(label)) return true
  }

  if (!hasChatOnPage()) return false

  if (button.closest('#show-hide-button, #close-button')) return true

  const label = getButtonLabelText(button)
  return isChatLabel(label)
}

export const isNativeChatTriggerTarget = (target: HTMLElement) => Boolean(target.closest(nativeChatTriggerSelectors))
