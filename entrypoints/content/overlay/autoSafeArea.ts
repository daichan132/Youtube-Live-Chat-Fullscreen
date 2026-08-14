import type { PixelChatGeometry } from '@/shared/settings/chatGeometry'
import type { PlayerObstacle } from '../platform/youtube/collectPlayerObstacles'

export type PlacementScore = {
  overlapArea: number
  movementDistance: number
  visibleArea: number
}

export type ScoredPlacement = {
  geometry: PixelChatGeometry
  score: PlacementScore
}

const area = (rect: { width: number; height: number }) => Math.max(0, rect.width) * Math.max(0, rect.height)

const overlapArea = (
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) =>
  Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)) *
  Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y))

const toRect = (geometry: PixelChatGeometry) => ({
  x: geometry.coordinates.x,
  y: geometry.coordinates.y,
  width: geometry.size.width,
  height: geometry.size.height,
})

export const scorePlacement = (
  geometry: PixelChatGeometry,
  current: PixelChatGeometry,
  reference: { width: number; height: number },
  obstacles: readonly PlayerObstacle[],
): PlacementScore => {
  const rect = toRect(geometry)
  const overlap = obstacles.reduce((sum, obstacle) => sum + overlapArea(rect, obstacle.rect), 0)
  const movementDistance = Math.hypot(geometry.coordinates.x - current.coordinates.x, geometry.coordinates.y - current.coordinates.y)
  const visibleArea = overlapArea(rect, { x: 0, y: 0, width: reference.width, height: reference.height })
  return { overlapArea: overlap, movementDistance, visibleArea }
}

const compareScore = (left: PlacementScore, right: PlacementScore) =>
  left.overlapArea - right.overlapArea || left.movementDistance - right.movementDistance || right.visibleArea - left.visibleArea

export const chooseAutoSafePlacement = (
  current: PixelChatGeometry,
  reference: { width: number; height: number },
  obstacles: readonly PlayerObstacle[],
  padding = 10,
): { current: ScoredPlacement; best: ScoredPlacement } => {
  const maxX = Math.max(padding, reference.width - padding - current.size.width)
  const maxY = Math.max(padding, reference.height - padding - current.size.height)
  const currentPlacement = { geometry: current, score: scorePlacement(current, current, reference, obstacles) }
  const candidates: PixelChatGeometry[] = [
    { coordinates: { x: padding, y: padding }, size: current.size },
    { coordinates: { x: maxX, y: padding }, size: current.size },
    { coordinates: { x: padding, y: maxY }, size: current.size },
    { coordinates: { x: maxX, y: maxY }, size: current.size },
  ]
  const best = candidates
    .map(geometry => ({ geometry, score: scorePlacement(geometry, current, reference, obstacles) }))
    .reduce(
      (bestPlacement, placement) => (compareScore(placement.score, bestPlacement.score) < 0 ? placement : bestPlacement),
      currentPlacement,
    )
  return { current: currentPlacement, best }
}

export const shouldApplyAutoSafePlacement = ({ current, best }: { current: ScoredPlacement; best: ScoredPlacement }) => {
  const chatArea = area(toRect(current.geometry))
  const overlapRatio = chatArea > 0 ? current.score.overlapArea / chatArea : 0
  const improvement = current.score.overlapArea - best.score.overlapArea
  return (
    overlapRatio >= 0.12 &&
    improvement >= Math.max(2400, chatArea * 0.05) &&
    (current.geometry.coordinates.x !== best.geometry.coordinates.x || current.geometry.coordinates.y !== best.geometry.coordinates.y)
  )
}
