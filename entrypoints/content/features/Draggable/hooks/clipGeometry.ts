export interface Clip {
  header: number
  input: number
}

export interface LayoutGeometry {
  coordinates: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
}

const HEADER_HEIGHT_OFFSET = 8
const INPUT_HEIGHT_OFFSET = 4

const clampClipValue = (value: number) => Math.max(0, value)

const INPUT_HEIGHT_SELECTORS = [
  'yt-live-chat-message-input-renderer',
  'yt-live-chat-restricted-participation-renderer',
  '#input-panel',
  'yt-live-chat-sign-in-prompt-renderer',
]

const getMaxHeightBySelectors = (container: ParentNode | null | undefined, selectors: string[]) =>
  selectors.reduce((maxHeight, selector) => {
    const nextHeight = container?.querySelector(selector)?.clientHeight ?? 0
    return nextHeight > maxHeight ? nextHeight : maxHeight
  }, 0)

export const measureClipFromBody = (container: ParentNode | null | undefined): Clip => {
  const headerHeight = container?.querySelector('yt-live-chat-header-renderer')?.clientHeight ?? 0
  const inputHeight = getMaxHeightBySelectors(container, INPUT_HEIGHT_SELECTORS)

  return {
    header: clampClipValue(headerHeight - HEADER_HEIGHT_OFFSET),
    input: clampClipValue(inputHeight - INPUT_HEIGHT_OFFSET),
  }
}

export const deriveClippedLayout = (baseLayout: LayoutGeometry, clip: Clip): LayoutGeometry => {
  const nextHeight = baseLayout.size.height + clip.header + clip.input

  return {
    coordinates: {
      x: baseLayout.coordinates.x,
      y: baseLayout.coordinates.y - clip.header,
    },
    size: {
      width: baseLayout.size.width,
      height: nextHeight,
    },
  }
}

export const isSameClip = (a: Clip, b: Clip) => a.header === b.header && a.input === b.input

export const isSameLayoutGeometry = (a: LayoutGeometry, b: LayoutGeometry) =>
  a.coordinates.x === b.coordinates.x &&
  a.coordinates.y === b.coordinates.y &&
  a.size.width === b.size.width &&
  a.size.height === b.size.height
