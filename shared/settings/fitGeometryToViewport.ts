import { MIN_CHAT_HEIGHT_PX, MIN_CHAT_WIDTH_PX } from './chatGeometry'

export type StoredGeometry = {
  coordinates: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
}

type ViewportSize = {
  width: number
  height: number
}

const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback)
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const fitGeometryToViewport = (geometry: StoredGeometry, viewport: ViewportSize, padding = 0): StoredGeometry => {
  const safePadding = Math.max(0, finiteOr(padding, 0))
  const availableWidth = Math.max(MIN_CHAT_WIDTH_PX, finiteOr(viewport.width, MIN_CHAT_WIDTH_PX) - safePadding * 2)
  const availableHeight = Math.max(MIN_CHAT_HEIGHT_PX, finiteOr(viewport.height, MIN_CHAT_HEIGHT_PX) - safePadding * 2)
  const width = clamp(finiteOr(geometry.size.width, MIN_CHAT_WIDTH_PX), MIN_CHAT_WIDTH_PX, availableWidth)
  const height = clamp(finiteOr(geometry.size.height, MIN_CHAT_HEIGHT_PX), MIN_CHAT_HEIGHT_PX, availableHeight)
  const maxX = Math.max(safePadding, finiteOr(viewport.width, width) - safePadding - width)
  const maxY = Math.max(safePadding, finiteOr(viewport.height, height) - safePadding - height)

  return {
    coordinates: {
      x: clamp(finiteOr(geometry.coordinates.x, safePadding), safePadding, maxX),
      y: clamp(finiteOr(geometry.coordinates.y, safePadding), safePadding, maxY),
    },
    size: { width, height },
  }
}
