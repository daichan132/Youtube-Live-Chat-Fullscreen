import { describe, expect, it } from 'vitest'
import { layoutGeometryToV2, legacyGeometryToV2, renderChatGeometry } from './chatGeometry'
import type { LegacyChatGeometry } from './model'

const legacy: LegacyChatGeometry = {
  reference: 'legacy-viewport-px',
  coordinates: { x: 96, y: 54 },
  size: { width: 480, height: 360 },
}

describe('player-relative chat geometry', () => {
  it('migrates old pixels only when a player reference is available', () => {
    expect(legacyGeometryToV2(legacy, { width: 1920, height: 1080 })).toEqual({
      reference: 'player',
      rect: { x: 0.05, y: 0.05, width: 0.25, height: 1 / 3 },
      pinned: true,
    })
  })

  it('renders ratios against the player and clamps only pixel size limits', () => {
    expect(
      renderChatGeometry(
        { reference: 'player', rect: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 }, pinned: false },
        { width: 1280, height: 720 },
      ),
    ).toEqual({ coordinates: { x: 128, y: 72 }, size: { width: 240, height: 180 } })
  })

  it('round-trips an interactive layout into normalized player ratios', () => {
    expect(
      layoutGeometryToV2({ coordinates: { x: 192, y: 108 }, size: { width: 480, height: 360 } }, { width: 1920, height: 1080 }, true),
    ).toEqual({ reference: 'player', rect: { x: 0.1, y: 0.1, width: 0.25, height: 1 / 3 }, pinned: true })
  })
})
