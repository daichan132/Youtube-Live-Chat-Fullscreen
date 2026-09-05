import { getCurrentLiveChatHost, isChatHostForCurrentVideo } from '../../chat/shared/iframeDom'
import { archivePlayerChatToggleProbe, archiveSidebarOpenControlProbe, type SelectorProbe } from './selectorCatalog'

export type YouTubeLiveChatFrameElement = HTMLElement & {
  onShowHideChat?: () => void
}

export type ArchiveChatControl = {
  element: HTMLElement
  probeId: string
  visible: boolean
  replay: boolean
}

const clickableSelector = 'button, yt-icon-button, [role="button"]'

const getButtonLabelText = (element: HTMLElement) =>
  `${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('title') ?? ''} ${element.getAttribute('data-title-no-tooltip') ?? ''} ${element.getAttribute('data-tooltip-text') ?? ''}`.toLowerCase()

const isChatLabel = (label: string) => label.includes('chat') || label.includes('チャット')
const isReplayLabel = (label: string) => label.includes('replay') || label.includes('リプレイ')

const isStructurallyLinkedToChat = (element: HTMLElement, host: HTMLElement | null) => {
  if (!host) return false
  const controlledIds = (element.getAttribute('aria-controls') ?? '').split(/\s+/).filter(Boolean)
  return controlledIds.some(id => {
    const controlled = element.ownerDocument.getElementById(id)
    return Boolean(controlled && (controlled === host || controlled.contains(host) || host.contains(controlled)))
  })
}

// Prefer structural relationships; localized label recognition is only a fallback.
export const isChatControl = (element: HTMLElement, host = getCurrentLiveChatHost()) =>
  isStructurallyLinkedToChat(element, host) || isChatLabel(getButtonLabelText(element))

const isControlVisible = (element: HTMLElement) => {
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0
}

const collectControls = (probe: SelectorProbe, host: HTMLElement | null, requireChatLabel: boolean): ArchiveChatControl[] => {
  const seen = new Set<HTMLElement>()
  const controls: ArchiveChatControl[] = []
  for (const [index, selector] of probe.selectors.entries()) {
    for (const target of document.querySelectorAll<HTMLElement>(selector)) {
      // Keep clickable targets restricted to supported YouTube controls.
      const element = target.matches(clickableSelector) ? target : target.querySelector<HTMLElement>(clickableSelector)
      if (!element || seen.has(element)) continue
      seen.add(element)
      if (element instanceof HTMLButtonElement && element.disabled) continue
      if (element.getAttribute('aria-disabled') === 'true') continue
      const parentHost = element.closest<HTMLElement>('ytd-live-chat-frame')
      if (parentHost ? !isChatHostForCurrentVideo(parentHost) : !host) continue
      if (requireChatLabel && !isChatControl(element, host)) continue
      controls.push({
        element,
        probeId: `${probe.probeId}.${index + 1}`,
        visible: isControlVisible(element),
        replay: isReplayLabel(getButtonLabelText(element)),
      })
    }
  }
  return controls
}

const preferVisible = (controls: readonly ArchiveChatControl[]) => controls.find(control => control.visible) ?? controls[0] ?? null

const hasShowHideContent = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLElement>('#show-hide-button')].some(
    slot => slot.querySelector(clickableSelector) !== null || (slot.textContent?.trim().length ?? 0) > 0,
  )

/** One observation of controls, including selector provenance and replay evidence. Never cache across page signals. */
export const collectArchiveChatControls = () => {
  const host = getCurrentLiveChatHost() as YouTubeLiveChatFrameElement | null
  const sidebarControls = collectControls(archiveSidebarOpenControlProbe, host, false)
  const playerControls = collectControls(archivePlayerChatToggleProbe, host, true)
  const sidebar = preferVisible(sidebarControls)
  const player = preferVisible(playerControls)
  const native = sidebar ?? player
  const replay = preferVisible(sidebarControls.filter(control => control.replay)) ?? preferVisible(playerControls.filter(control => control.replay))
  return {
    sidebar,
    player,
    native,
    replay,
    canOpen: native !== null || Boolean(host && typeof host.onShowHideChat === 'function' && hasShowHideContent(host)),
  }
}
