type OverlayElementState = {
  tag: string
  x: number
  y: number
  width: number
  height: number
  opacity: string
  pointerEvents: string
  display: string
  background: string
  transform: string
}

type OverlayState = {
  fullscreen: boolean
  overlayMounted: boolean
  elements: Record<
    'resizable' | 'frame' | 'chatInner' | 'controlRail' | 'settingsButton' | 'dragHandle' | 'extensionIframe',
    OverlayElementState | null
  >
}

type DiagnosticOverlayState = OverlayState & {
  url: string
  extensionDomExpected: boolean
  extensionDomMounted: boolean
  extensionHostMounted: boolean
  switchButtonSlotMounted: boolean
}

export function readOverlayState(options: { includeDiagnostics: true }): DiagnosticOverlayState
export function readOverlayState(options?: { includeDiagnostics?: false }): OverlayState
export function readOverlayState(options: { includeDiagnostics?: boolean }): OverlayState | DiagnosticOverlayState
