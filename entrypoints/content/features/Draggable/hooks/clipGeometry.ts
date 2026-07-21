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
  viewportHeight,
  viewportPadding,
}: ControlRailPlacement) => {
  const desiredTop = chatHeight + gap
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
