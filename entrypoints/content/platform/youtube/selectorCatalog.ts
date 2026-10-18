export type SelectorProbe = {
  readonly probeId: string
  readonly selectors: readonly string[]
}

export const watchSurfaceProbe = { probeId: 'watch.surface.v1', selectors: ['ytd-watch-flexy', 'ytd-watch-grid'] } as const
export const playerProbe = { probeId: 'player.v1', selectors: ['#movie_player'] } as const
export const rightControlsProbe = { probeId: 'controls.right.v1', selectors: ['.ytp-right-controls'] } as const
export const nativeChatHostProbe = { probeId: 'chat.host.v1', selectors: ['ytd-live-chat-frame'] } as const
export const chatContainerProbe = { probeId: 'chat.container.v1', selectors: ['#chat-container'] } as const
export const secondaryPanelProbe = { probeId: 'watch.secondary.v1', selectors: ['#secondary'] } as const
export const nativeChatOpenSlotProbe = { probeId: 'chat.open-slot.v1', selectors: ['#show-hide-button'] } as const
export const nativeChatPanelToggleProbe = {
  probeId: 'chat.panel-toggle.v1',
  selectors: [...nativeChatOpenSlotProbe.selectors, '#close-button'],
} as const
export const nativeChatSidebarToggleProbe = {
  probeId: 'chat.sidebar-toggle.v1',
  selectors: nativeChatHostProbe.selectors.flatMap(host => nativeChatPanelToggleProbe.selectors.map(toggle => `${host} ${toggle}`)),
} as const
export const nativeChatTriggerProbe = {
  probeId: 'chat.trigger.v1',
  selectors: [...chatContainerProbe.selectors, ...nativeChatHostProbe.selectors, ...nativeChatPanelToggleProbe.selectors],
} as const
export const chatControlMetadataBoundaryProbe = {
  probeId: 'chat.control-metadata-boundary.v1',
  selectors: [...nativeChatHostProbe.selectors, ...rightControlsProbe.selectors, ...playerProbe.selectors, 'body'],
} as const
/** Native active state and rendered offer boundaries; never match paid chat messages. */
export const chatPurchaseInputProbe = {
  probeId: 'chat.purchase-input.v1',
  selectors: ['yt-live-chat-message-input-renderer', 'yt-live-chat-restricted-participation-renderer'],
} as const
export const chatPurchasePanelProbe = {
  probeId: 'chat.purchase-panel.v1',
  selectors: [
    'yt-live-chat-product-picker-panel-view-model',
    'yt-live-chat-message-buy-flow-renderer',
    'yt-live-chat-paid-sticker-panel-renderer',
    'yt-live-chat-super-sticker-preview-renderer',
    'yt-live-chat-super-sticker-pack-renderer',
    'ytd-sponsorships-gift-offer-renderer',
    'yt-pdg-gift-collection-view-model',
  ],
} as const
export const chatPurchaseLoadingProbe = {
  probeId: 'chat.purchase-loading.v1',
  selectors: ['#panel-pages > #loading.yt-live-chat-renderer'],
} as const
export const nativeChatIframeProbe = {
  probeId: 'chat.iframe.v2',
  selectors: ['#chatframe', 'ytd-live-chat-frame iframe.ytd-live-chat-frame'],
} as const
export const chatRendererProbe = { probeId: 'chat.renderer.v1', selectors: ['yt-live-chat-renderer'] } as const
export const collapsedPinnedMessageContentProbe = {
  probeId: 'chat.pinned-message-content.v1',
  selectors: ['yt-live-chat-banner-renderer yt-live-chat-text-message-renderer[in-collapsed-banner] #content'],
} as const
export const chatItemListRendererProbe = { probeId: 'chat.item-list.v1', selectors: ['yt-live-chat-item-list-renderer'] } as const
export const chatUnavailableMessageProbe = {
  probeId: 'chat.unavailable-message.v1',
  selectors: ['yt-live-chat-unavailable-message-renderer'],
} as const
export const chatStatusMessageProbe = { probeId: 'chat.status-message.v1', selectors: ['yt-live-chat-message-renderer'] } as const
export const fullscreenButtonProbe = { probeId: 'controls.fullscreen.v1', selectors: ['button.ytp-fullscreen-button'] } as const
export const liveTimeDisplayProbe = {
  probeId: 'player.live-time.v1',
  selectors: ['.ytp-time-display.ytp-live'],
} as const
export const liveHeadBadgeProbe = {
  probeId: 'player.live-badge.v1',
  selectors: ['.ytp-live-badge.ytp-live-badge-is-livehead'],
} as const
export const playerLiveUiBoundaryProbe = {
  probeId: 'player.live-ui-boundary.v1',
  selectors: ['.ytp-time-display', '.ytp-live-badge'],
} as const
export const captionObstacleProbe = {
  probeId: 'obstacle.caption.v1',
  selectors: ['.ytp-caption-window-container', '.caption-window'],
} as const
export const playerControlsObstacleProbe = { probeId: 'obstacle.controls.v1', selectors: ['.ytp-chrome-bottom'] } as const
export const playerMenuObstacleProbe = {
  probeId: 'obstacle.menu.v1',
  selectors: ['.ytp-popup:not(.ytp-settings-menu-hidden)', '.ytp-panel-menu'],
} as const
export const playerMenuObstacleBoundaryProbe = {
  probeId: 'obstacle.menu-boundary.v1',
  selectors: ['.ytp-popup', '.ytp-panel-menu'],
} as const
export const endScreenObstacleProbe = {
  probeId: 'obstacle.endscreen.v1',
  selectors: ['.html5-endscreen', '.ytp-ce-element'],
} as const
export const playerObstacleBoundarySelector = [
  ...captionObstacleProbe.selectors,
  ...playerControlsObstacleProbe.selectors,
  ...playerMenuObstacleBoundaryProbe.selectors,
  ...endScreenObstacleProbe.selectors,
].join(', ')
export const runtimeBoundarySelector = [
  ...watchSurfaceProbe.selectors,
  ...playerProbe.selectors,
  ...rightControlsProbe.selectors,
  ...nativeChatHostProbe.selectors,
  ...nativeChatIframeProbe.selectors,
  ...chatContainerProbe.selectors,
  ...nativeChatOpenSlotProbe.selectors,
  ...secondaryPanelProbe.selectors,
  '#panels-full-bleed-container',
  ...playerLiveUiBoundaryProbe.selectors,
].join(', ')
export const archiveSidebarOpenControlProbe = {
  probeId: 'chat.archive.sidebar.v1',
  selectors: [
    'ytd-live-chat-frame #show-hide-button button',
    'ytd-live-chat-frame #show-hide-button yt-icon-button',
    '#chat-container #show-hide-button button',
    '#chat-container #show-hide-button yt-icon-button',
    'ytd-live-chat-frame #show-hide-button',
    '#chat-container #show-hide-button',
  ],
} as const
export const archivePlayerChatToggleProbe = {
  probeId: 'chat.archive.player.v2',
  selectors: [
    '.ytp-right-controls toggle-button-view-model button[aria-pressed="false"]',
    '.ytp-right-controls button-view-model button[aria-pressed="false"]',
    '#movie_player toggle-button-view-model button[aria-pressed="false"]',
    '#movie_player button-view-model button[aria-pressed="false"]',
  ],
} as const

export const youtubeSelectorCatalog = {
  watchSurface: watchSurfaceProbe,
  player: playerProbe,
  rightControls: rightControlsProbe,
  nativeChatHost: nativeChatHostProbe,
  chatContainer: chatContainerProbe,
  secondaryPanel: secondaryPanelProbe,
  nativeChatOpenSlot: nativeChatOpenSlotProbe,
  nativeChatPanelToggle: nativeChatPanelToggleProbe,
  nativeChatSidebarToggle: nativeChatSidebarToggleProbe,
  nativeChatTrigger: nativeChatTriggerProbe,
  chatControlMetadataBoundary: chatControlMetadataBoundaryProbe,
  chatPurchaseInput: chatPurchaseInputProbe,
  chatPurchasePanel: chatPurchasePanelProbe,
  chatPurchaseLoading: chatPurchaseLoadingProbe,
  nativeChatIframe: nativeChatIframeProbe,
  chatRenderer: chatRendererProbe,
  collapsedPinnedMessageContent: collapsedPinnedMessageContentProbe,
  chatItemListRenderer: chatItemListRendererProbe,
  chatUnavailableMessage: chatUnavailableMessageProbe,
  chatStatusMessage: chatStatusMessageProbe,
  fullscreenButton: fullscreenButtonProbe,
  liveTimeDisplay: liveTimeDisplayProbe,
  liveHeadBadge: liveHeadBadgeProbe,
  playerLiveUiBoundary: playerLiveUiBoundaryProbe,
  captionObstacle: captionObstacleProbe,
  playerControlsObstacle: playerControlsObstacleProbe,
  playerMenuObstacle: playerMenuObstacleProbe,
  playerMenuObstacleBoundary: playerMenuObstacleBoundaryProbe,
  endScreenObstacle: endScreenObstacleProbe,
  archiveSidebarOpenControl: archiveSidebarOpenControlProbe,
  archivePlayerChatToggle: archivePlayerChatToggleProbe,
} as const satisfies Record<string, SelectorProbe>

const candidateProbeId = (probe: SelectorProbe, index: number) => `${probe.probeId}.${index + 1}`

export const matchesProbe = (element: Element, probe: SelectorProbe) => probe.selectors.some(selector => element.matches(selector))

/** Find the nearest matching ancestor, independent of fallback selector order. */
export const closestProbe = <T extends Element>(element: Element, probe: SelectorProbe): T | null =>
  element.closest<T>(probe.selectors.join(', '))

export const queryFirstProbe = <T extends Element>(
  root: ParentNode,
  probe: SelectorProbe,
): { element: T | null; probeId: string | null } => {
  for (const [index, selector] of probe.selectors.entries()) {
    const element = root.querySelector<T>(selector)
    if (element) return { element, probeId: candidateProbeId(probe, index) }
  }
  return { element: null, probeId: null }
}

export const queryAllProbes = <T extends Element>(root: ParentNode, probe: SelectorProbe) => {
  const elements = new Set<T>()
  const probeIds: string[] = []
  for (const [index, selector] of probe.selectors.entries()) {
    const matches = root.querySelectorAll<T>(selector)
    if (matches.length > 0) probeIds.push(candidateProbeId(probe, index))
    for (const element of matches) elements.add(element)
  }
  return { elements: [...elements], probeIds }
}

export const identifyProbeForElement = (root: ParentNode, probe: SelectorProbe, element: Element | null) => {
  if (!element) return null
  for (const [index, selector] of probe.selectors.entries()) {
    const candidates = root.querySelectorAll(selector)
    if ([...candidates].some(candidate => candidate === element || candidate.contains(element) || element.contains(candidate))) {
      return candidateProbeId(probe, index)
    }
  }
  return null
}

export const archiveSidebarOpenSelectors = archiveSidebarOpenControlProbe.selectors
export const archivePlayerChatToggleSelectors = archivePlayerChatToggleProbe.selectors
