import { MIN_CHAT_HEIGHT_PX, MIN_CHAT_WIDTH_PX } from '@/shared/settings/chatGeometry'

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
  viewportHeight: number
  viewportPadding: number
}

type ResizeDelta = {
  width: number
  height: number
}

export type ResizeDirection = 'top' | 'left' | 'topLeft' | 'bottomLeft' | 'topRight' | 'right' | 'bottom' | 'bottomRight'

const ensurePositiveCoordinate = (value: number): number => Math.max(0, value)

export const getControlRailTop = ({
  chatHeight,
  containerTop,
  controlHeight,
  gap,
  viewportHeight,
  viewportPadding,
}: ControlRailPlacement) => {
  const desiredTop = chatHeight + gap
  const minTop = viewportPadding - containerTop
  const maxTop = viewportHeight - containerTop - controlHeight - viewportPadding

  return Math.max(minTop, Math.min(desiredTop, maxTop))
}

export const shiftsLeftEdge = (direction: ResizeDirection) => direction === 'left' || direction === 'topLeft' || direction === 'bottomLeft'
export const shiftsTopEdge = (direction: ResizeDirection) => direction === 'top' || direction === 'topLeft' || direction === 'topRight'

export const deriveResizedLayout = ({
  startCoordinates,
  currentSize,
  direction,
  delta,
  maxSize,
}: {
  startCoordinates: LayoutGeometry['coordinates']
  currentSize: LayoutGeometry['size']
  direction: ResizeDirection
  delta: ResizeDelta
  maxSize?: LayoutGeometry['size']
}): LayoutGeometry => {
  const movesLeftEdge = shiftsLeftEdge(direction)
  const movesTopEdge = shiftsTopEdge(direction)
  const fixedRight = startCoordinates.x + currentSize.width
  const fixedBottom = startCoordinates.y + currentSize.height
  const widthDelta = direction === 'top' || direction === 'bottom' ? 0 : delta.width
  const heightDelta = direction === 'left' || direction === 'right' ? 0 : delta.height
  const requestedWidth = movesLeftEdge ? currentSize.width - widthDelta : currentSize.width + widthDelta
  const requestedHeight = movesTopEdge ? currentSize.height - heightDelta : currentSize.height + heightDelta
  const width = Math.max(MIN_CHAT_WIDTH_PX, Math.min(requestedWidth, maxSize?.width ?? Number.POSITIVE_INFINITY))
  const height = Math.max(MIN_CHAT_HEIGHT_PX, Math.min(requestedHeight, maxSize?.height ?? Number.POSITIVE_INFINITY))
  const x = movesLeftEdge ? ensurePositiveCoordinate(fixedRight - width) : startCoordinates.x
  const y = movesTopEdge ? ensurePositiveCoordinate(fixedBottom - height) : startCoordinates.y

  return {
    coordinates: { x, y },
    size: {
      width: movesLeftEdge ? fixedRight - x : width,
      height: movesTopEdge ? fixedBottom - y : height,
    },
  }
}
