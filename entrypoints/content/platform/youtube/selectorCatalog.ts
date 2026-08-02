type SelectorProbe = {
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
  archiveSidebarOpenControl: archiveSidebarOpenControlProbe,
  archivePlayerChatToggle: archivePlayerChatToggleProbe,
} as const satisfies Record<string, SelectorProbe>

const candidateProbeId = (probe: SelectorProbe, index: number) => `${probe.probeId}.${index + 1}`

export const queryFirstProbe = <T extends Element>(
  root: ParentNode,
  probe: SelectorProbe,
): { element: T | null; probeId: string | null } => {
  for (let index = 0; index < probe.selectors.length; index += 1) {
    const element = root.querySelector<T>(probe.selectors[index])
    if (element) return { element, probeId: candidateProbeId(probe, index) }
  }
  return { element: null, probeId: null }
}

export const queryAllProbes = <T extends Element>(root: ParentNode, probe: SelectorProbe) => {
  const elements = new Set<T>()
  const probeIds: string[] = []
  for (let index = 0; index < probe.selectors.length; index += 1) {
    const matches = root.querySelectorAll<T>(probe.selectors[index])
    if (matches.length > 0) probeIds.push(candidateProbeId(probe, index))
    for (const element of matches) elements.add(element)
  }
  return { elements: [...elements], probeIds }
}

export const archiveSidebarOpenSelectors = archiveSidebarOpenControlProbe.selectors
export const archivePlayerChatToggleSelectors = archivePlayerChatToggleProbe.selectors
