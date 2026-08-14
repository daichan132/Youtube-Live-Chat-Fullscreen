export type SelectorProbe = {
  readonly probeId: string
  readonly selectors: readonly string[]
}

export const watchSurfaceProbe = { probeId: 'watch.surface.v1', selectors: ['ytd-watch-flexy', 'ytd-watch-grid'] } as const
export const playerProbe = { probeId: 'player.v1', selectors: ['#movie_player'] } as const
export const rightControlsProbe = { probeId: 'controls.right.v1', selectors: ['.ytp-right-controls'] } as const
export const nativeChatHostProbe = { probeId: 'chat.host.v1', selectors: ['ytd-live-chat-frame'] } as const
export const nativeChatIframeProbe = {
  probeId: 'chat.iframe.v2',
  selectors: ['#chatframe', 'ytd-live-chat-frame iframe.ytd-live-chat-frame'],
} as const
export const fullscreenButtonProbe = { probeId: 'controls.fullscreen.v1', selectors: ['button.ytp-fullscreen-button'] } as const
export const captionObstacleProbe = {
  probeId: 'obstacle.caption.v1',
  selectors: ['.ytp-caption-window-container', '.caption-window'],
} as const
export const playerControlsObstacleProbe = { probeId: 'obstacle.controls.v1', selectors: ['.ytp-chrome-bottom'] } as const
export const playerMenuObstacleProbe = {
  probeId: 'obstacle.menu.v1',
  selectors: ['.ytp-popup:not(.ytp-settings-menu-hidden)', '.ytp-panel-menu'],
} as const
export const endScreenObstacleProbe = {
  probeId: 'obstacle.endscreen.v1',
  selectors: ['.html5-endscreen', '.ytp-ce-element'],
} as const
export const runtimeBoundarySelector =
  'ytd-watch-flexy, ytd-watch-grid, #movie_player, .ytp-right-controls, ytd-live-chat-frame, #chatframe, #chat-container, #show-hide-button, #secondary, #panels-full-bleed-container'
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
  nativeChatIframe: nativeChatIframeProbe,
  fullscreenButton: fullscreenButtonProbe,
  captionObstacle: captionObstacleProbe,
  playerControlsObstacle: playerControlsObstacleProbe,
  playerMenuObstacle: playerMenuObstacleProbe,
  endScreenObstacle: endScreenObstacleProbe,
  archiveSidebarOpenControl: archiveSidebarOpenControlProbe,
  archivePlayerChatToggle: archivePlayerChatToggleProbe,
} as const satisfies Record<string, SelectorProbe>

const candidateProbeId = (probe: SelectorProbe, index: number) => `${probe.probeId}.${index + 1}`

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
