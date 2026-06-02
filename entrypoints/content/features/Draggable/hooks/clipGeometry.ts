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

export type ControlRailPlacement = {
  chatHeight: number
  containerTop: number
  controlHeight: number
  gap: number
  isClipPath: boolean
  clipInput: number
  viewportHeight: number
  viewportPadding: number
}

type ResizeDelta = {
  width: number
  height: number
}

export type ResizeDirection = 'top' | 'left' | 'topLeft' | 'bottomLeft' | 'topRight' | 'right' | 'bottom' | 'bottomRight'

const HEADER_HEIGHT_OFFSET = 12
const INPUT_HEIGHT_OFFSET = 0

const clampClipValue = (value: number) => Math.max(0, value)
const ensurePositiveCoordinate = (value: number): number => Math.max(0, value)

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

export const fitLayoutWithinViewportWidth = (layout: LayoutGeometry, viewportWidth: number): LayoutGeometry => {
  const {
    coordinates: { x, y },
    size: { width, height },
  } = layout
  const overflow = x + width - viewportWidth

  if (overflow <= 0) {
    return layout
  }

  const nextX = x - overflow
  if (nextX >= 0) {
    return {
      coordinates: { x: nextX, y },
      size: { width, height },
    }
  }

  const nextWidth = width - overflow
  if (nextWidth >= 0) {
    return {
      coordinates: { x, y },
      size: { width: nextWidth, height },
    }
  }

  return layout
}

export const getControlRailTop = ({
  chatHeight,
  containerTop,
  controlHeight,
  gap,
  isClipPath,
  clipInput,
  viewportHeight,
  viewportPadding,
}: ControlRailPlacement) => {
  const visibleChatBottom = chatHeight - (isClipPath ? clipInput : 0)
  const desiredTop = visibleChatBottom + gap
  const minTop = viewportPadding - containerTop
  const maxTop = viewportHeight - containerTop - controlHeight - viewportPadding

  return Math.max(minTop, Math.min(desiredTop, maxTop))
}

const shiftsLeftEdge = (direction: ResizeDirection) => direction === 'left' || direction === 'topLeft' || direction === 'bottomLeft'
const shiftsTopEdge = (direction: ResizeDirection) => direction === 'top' || direction === 'topLeft' || direction === 'topRight'

export const deriveResizedLayout = ({
  startCoordinates,
  currentSize,
  direction,
  delta,
}: {
  startCoordinates: LayoutGeometry['coordinates']
  currentSize: LayoutGeometry['size']
  direction: ResizeDirection
  delta: ResizeDelta
}): LayoutGeometry => {
  const xDelta = shiftsLeftEdge(direction) ? -delta.width : 0
  const yDelta = shiftsTopEdge(direction) ? -delta.height : 0

  return {
    coordinates: {
      x: ensurePositiveCoordinate(startCoordinates.x + xDelta),
      y: ensurePositiveCoordinate(startCoordinates.y + yDelta),
    },
    size: {
      width: currentSize.width + delta.width,
      height: currentSize.height + delta.height,
    },
  }
}
