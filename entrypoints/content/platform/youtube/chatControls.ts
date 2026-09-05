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

const metadataElements = (element: HTMLElement) => {
  const wrapper = element.closest<HTMLElement>('yt-icon-button')
  return wrapper && wrapper !== element ? [element, wrapper] : [element]
}

const getButtonLabelText = (element: HTMLElement) =>
  metadataElements(element)
    .map(target =>
      ['aria-label', 'title', 'data-title-no-tooltip', 'data-tooltip-text'].map(attribute => target.getAttribute(attribute) ?? '').join(' '),
    )
    .join(' ')
    .toLowerCase()

const isChatLabel = (label: string) => label.includes('chat') || label.includes('チャット')
const isReplayLabel = (label: string) => label.includes('replay') || label.includes('リプレイ')

// An explicit relationship is authoritative. A familiar label must not turn
// a stale or unrelated aria-controls target into the current video's chat.
export const isChatControl = (element: HTMLElement, host = getCurrentLiveChatHost()) => {
  const owner = metadataElements(element).find(target => target.getAttribute('aria-controls')?.trim())
  const controlledIds = (owner?.getAttribute('aria-controls') ?? '').split(/\s+/).filter(Boolean)
  if (controlledIds.length === 0) return isChatLabel(getButtonLabelText(element))
  if (!host) return false
  return controlledIds.some(id => {
    const controlled = element.ownerDocument.getElementById(id)
    return Boolean(controlled && (controlled === host || controlled.contains(host) || host.contains(controlled)))
  })
}

const isControlVisible = (element: HTMLElement) => {
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0
}

const collectControls = (probe: SelectorProbe, host: HTMLElement | null, requireChatLabel: boolean) => {
  const seen = new Set<HTMLElement>()
  const controls: ArchiveChatControl[] = []
  let hasDisabledControl = false
  for (const [index, selector] of probe.selectors.entries()) {
    for (const target of document.querySelectorAll<HTMLElement>(selector)) {
      // Resolve an icon-button wrapper to its actual control. Otherwise a
      // disabled child skipped by one selector could reappear as its wrapper.
      const element = target.matches('button')
        ? target
        : (target.querySelector<HTMLElement>(clickableSelector) ?? (target.matches(clickableSelector) ? target : null))
      if (!element || seen.has(element)) continue
      seen.add(element)
      const parentHost = element.closest<HTMLElement>('ytd-live-chat-frame')
      if (parentHost ? !isChatHostForCurrentVideo(parentHost) : !host) continue
      if (requireChatLabel && !isChatControl(element, host)) continue
      if (element.matches(':disabled') || element.closest('[aria-disabled="true"], [inert]')) {
        hasDisabledControl = true
        continue
      }
      controls.push({
        element,
        probeId: `${probe.probeId}.${index + 1}`,
        visible: isControlVisible(element),
        replay: isReplayLabel(getButtonLabelText(element)),
      })
    }
  }
  return { controls, hasDisabledControl }
}

const preferVisible = (controls: readonly ArchiveChatControl[]) => controls.find(control => control.visible) ?? controls[0] ?? null

/** One observation of controls, including selector provenance and replay evidence. Never cache across page signals. */
export const collectArchiveChatControls = () => {
  const host = getCurrentLiveChatHost() as YouTubeLiveChatFrameElement | null
  const sidebarResult = collectControls(archiveSidebarOpenControlProbe, host, false)
  const playerResult = collectControls(archivePlayerChatToggleProbe, host, true)
  const sidebar = preferVisible(sidebarResult.controls)
  const player = preferVisible(playerResult.controls)
  const native = sidebar ?? player
  const replay =
    preferVisible(sidebarResult.controls.filter(control => control.replay)) ??
    preferVisible(playerResult.controls.filter(control => control.replay))
  const slots = host ? [...host.querySelectorAll<HTMLElement>('#show-hide-button')] : []
  const hasSlotControl = slots.some(slot => slot.matches(clickableSelector) || slot.querySelector(clickableSelector) !== null)
  // A host method supports text-only/unfinished YouTube UI. It is not a way
  // to bypass a known disabled control that the adapter deliberately rejected.
  const fallbackHost =
    host &&
    typeof host.onShowHideChat === 'function' &&
    !hasSlotControl &&
    !sidebarResult.hasDisabledControl &&
    !playerResult.hasDisabledControl &&
    !host.closest('[aria-disabled="true"], [inert]')
      ? host
      : null
  return {
    sidebar,
    player,
    native,
    replay,
    fallbackHost,
    canOpen: native !== null || Boolean(fallbackHost && slots.some(slot => (slot.textContent?.trim().length ?? 0) > 0)),
  }
}
