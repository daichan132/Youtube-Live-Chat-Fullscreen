import { describe, expect, it } from 'vitest'
import { getDraggableItemStyles } from './draggableItemStyles'

describe('getDraggableItemStyles', () => {
  it('applies drag transform to the shared frame', () => {
    const { frameStyle, innerDivStyle } = getDraggableItemStyles({
      top: 20,
      left: 10,
      transform: { x: 12, y: 8 },
    })

    expect(frameStyle.transform).toBe('translate3d(12px, 8px, 0)')
    expect(innerDivStyle.transform).toBeUndefined()
  })

  it('keeps the resizable wrapper on the visible panel geometry', () => {
    const { resizableStyle } = getDraggableItemStyles({
      top: 20,
      left: 10,
      transform: null,
    })

    expect(resizableStyle).toEqual({
      top: 20,
      left: 10,
      pointerEvents: 'auto',
    })
  })

  it('clips iframe overflow on the visible chat panel', () => {
    const { innerDivStyle } = getDraggableItemStyles({
      top: 20,
      left: 10,
      transform: null,
    })

    expect(innerDivStyle).toEqual({
      overflow: 'hidden',
      borderRadius: 6,
    })
  })
})
