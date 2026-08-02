import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import type { ChatGeometry, ChatGeometryV2, LegacyChatGeometry } from './model'

export const MIN_CHAT_WIDTH_PX = 240
export const MIN_CHAT_HEIGHT_PX = 180
export const MAX_CHAT_WIDTH_RATIO = 0.65
export const MAX_CHAT_HEIGHT_RATIO = 0.9

export type GeometryReferenceSize = {
  width: number
  height: number
}

export type PixelChatGeometry = {
  coordinates: { x: number; y: number }
  size: { width: number; height: number }
}

const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback)
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const safeReference = (reference: GeometryReferenceSize) => ({
  width: Math.max(1, finiteOr(reference.width, 1)),
  height: Math.max(1, finiteOr(reference.height, 1)),
})

export const isChatGeometryV2 = (geometry: ChatGeometry): geometry is ChatGeometryV2 => geometry.reference === 'player'

export const legacyGeometryToV2 = (geometry: LegacyChatGeometry, reference: GeometryReferenceSize): ChatGeometryV2 => {
  const safe = safeReference(reference)
  return normalizeChatGeometryV2({
    reference: 'player',
    rect: {
      x: geometry.coordinates.x / safe.width,
      y: geometry.coordinates.y / safe.height,
      width: geometry.size.width / safe.width,
      height: geometry.size.height / safe.height,
    },
    pinned: true,
  })
}

export const normalizeChatGeometryV2 = (geometry: ChatGeometryV2): ChatGeometryV2 => {
  const width = clamp(finiteOr(geometry.rect.width, 0.3125), 0, MAX_CHAT_WIDTH_RATIO)
  const height = clamp(finiteOr(geometry.rect.height, 0.555556), 0, MAX_CHAT_HEIGHT_RATIO)
  return {
    reference: 'player',
    rect: {
      x: clamp(finiteOr(geometry.rect.x, 0), 0, Math.max(0, 1 - width)),
      y: clamp(finiteOr(geometry.rect.y, 0), 0, Math.max(0, 1 - height)),
      width,
      height,
    },
    pinned: geometry.pinned,
  }
}

export const renderChatGeometry = (geometry: ChatGeometry, reference: GeometryReferenceSize): PixelChatGeometry => {
  const safe = safeReference(reference)
  const normalized = isChatGeometryV2(geometry) ? normalizeChatGeometryV2(geometry) : legacyGeometryToV2(geometry, safe)
  const maxWidth = Math.max(MIN_CHAT_WIDTH_PX, safe.width * MAX_CHAT_WIDTH_RATIO)
  const maxHeight = Math.max(MIN_CHAT_HEIGHT_PX, safe.height * MAX_CHAT_HEIGHT_RATIO)
  const width = clamp(safe.width * normalized.rect.width, Math.min(MIN_CHAT_WIDTH_PX, safe.width), maxWidth)
  const height = clamp(safe.height * normalized.rect.height, Math.min(MIN_CHAT_HEIGHT_PX, safe.height), maxHeight)
  return {
    coordinates: {
      x: clamp(safe.width * normalized.rect.x, 0, Math.max(0, safe.width - width)),
      y: clamp(safe.height * normalized.rect.y, 0, Math.max(0, safe.height - height)),
    },
    size: { width, height },
  }
}

export const layoutGeometryToV2 = (geometry: PixelChatGeometry, reference: GeometryReferenceSize, pinned: boolean): ChatGeometryV2 => {
  const safe = safeReference(reference)
  return normalizeChatGeometryV2({
    reference: 'player',
    rect: {
      x: geometry.coordinates.x / safe.width,
      y: geometry.coordinates.y / safe.height,
      width: geometry.size.width / safe.width,
      height: geometry.size.height / safe.height,
    },
    pinned,
  })
}

export const normalizeLegacyChatGeometry = (
  coordinates: { x: number; y: number },
  size: { width: number; height: number },
): LegacyChatGeometry => ({
  reference: 'legacy-viewport-px',
  coordinates: {
    x: finiteOr(coordinates.x, 20),
    y: finiteOr(coordinates.y, 20),
  },
  size: {
    width: Math.max(ResizableMinWidth, finiteOr(size.width, 400)),
    height: Math.max(ResizableMinHeight, finiteOr(size.height, 400)),
  },
})
