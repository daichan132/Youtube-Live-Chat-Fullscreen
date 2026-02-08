import { SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'

type YouTubeLiveChatFrameElement = HTMLElement & {
  onShowHideChat?: () => void
}

const nativeChatTriggerSelectors =
  '#chat-container, ytd-live-chat-frame, ytd-live-chat-frame #show-hide-button, ytd-live-chat-frame #close-button, #show-hide-button, #close-button'

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

const archivePlayerChatToggleSelectors = [
  '.ytp-right-controls toggle-button-view-model button[aria-pressed="false"]',
  '.ytp-right-controls button-view-model button[aria-pressed="false"]',
  '#movie_player toggle-button-view-model button[aria-pressed="false"]',
  '#movie_player button-view-model button[aria-pressed="false"]',
]

const isNativeChatMarkedExpanded = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(watchFlexy?.hasAttribute('live-chat-present-and-expanded') || watchGrid?.hasAttribute('live-chat-present-and-expanded'))
}

const isNativeChatHostVisible = () => {
  const host = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  if (!host) return false
  if (host.hasAttribute('hidden') || host.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(host)
  return style.display !== 'none' && style.visibility !== 'hidden'
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

const resolveClickable = (target: HTMLElement) =>
  target.matches('button, yt-icon-button, tp-yt-paper-icon-button, [role="button"]')
    ? target
    : (target.querySelector<HTMLElement>('button, yt-icon-button, tp-yt-paper-icon-button, [role="button"]') ?? target)

const getButtonLabelText = (element: HTMLElement) =>
  `${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('title') ?? ''} ${element.getAttribute('data-title-no-tooltip') ?? ''} ${element.getAttribute('data-tooltip-text') ?? ''}`.toLowerCase()

const isChatLabel = (label: string) => label.includes('chat') || label.includes('チャット')

const isElementVisible = (element: HTMLElement) => {
  if (element.hasAttribute('hidden')) return false
  if (element.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom')) return true
  return element.getClientRects().length > 0
}

const clickFirstMatchingSelector = (
  selectors: string[],
  options: {
    requireChatLabel?: boolean
    requireVisible?: boolean
  } = {},
) => {
  const requireVisible = options.requireVisible ?? true
  for (const selector of selectors) {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(selector))
    for (const target of targets) {
      const clickable = resolveClickable(target)
      if (requireVisible && !isElementVisible(clickable)) continue
      if (clickable instanceof HTMLButtonElement && clickable.disabled) continue
      if (clickable.getAttribute('aria-disabled') === 'true') continue
      if (options.requireChatLabel && !isChatLabel(getButtonLabelText(clickable))) continue
      clickable.click()
      return true
    }
  }
  return false
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
  if (!host) return false
  if (typeof host.onShowHideChat !== 'function') return false
  host.onShowHideChat()
  return true
}

export const openArchiveNativeChatPanel = () => {
  // `#show-hide-button` is a toggle. If YouTube already marks expanded and
  // iframe is non-blank, avoid toggling it closed by mistake.
  if (isNativeChatMarkedExpanded() && !isNativeChatIframeBlank() && isNativeChatHostVisible()) {
    return false
  }

  if (clickFirstMatchingSelector(archiveSidebarOpenSelectors, { requireVisible: true })) return true
  if (clickFirstMatchingSelector(archiveSidebarOpenSelectors, { requireVisible: false })) return true

  revealPlayerControls()

  if (clickFirstMatchingSelector(archivePlayerChatToggleSelectors, { requireChatLabel: true, requireVisible: true })) return true
  if (clickFirstMatchingSelector(archivePlayerChatToggleSelectors, { requireChatLabel: true, requireVisible: false })) return true
  if (tryInvokeChatFrameShowHide()) return true

  return false
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
    const label = getButtonLabelText(button)
    if (isToggleViewModel) return isChatLabel(label)
    if (isChatLabel(label)) return true
  }

  if (!hasChatOnPage()) return false

  if (button.closest('#show-hide-button, #close-button')) return true

  const label = getButtonLabelText(button)
  return isChatLabel(label)
}

export const isNativeChatTriggerTarget = (target: HTMLElement) => Boolean(target.closest(nativeChatTriggerSelectors))
