import { describe, expect, it } from 'vitest'
import { CLIP_GEOMETRY_TRANSITION } from '../constants/animation'
import { getDraggableItemStyles } from './draggableItemStyles'

const baseProps = {
  top: 20,
  left: 10,
  disableTopTransition: false,
  isResizing: false,
  transform: null,
  clip: { header: 28, input: 24 },
}

describe('getDraggableItemStyles', () => {
  it('disables geometry animation on the first clip frame', () => {
    const { resizableStyle, innerDivStyle } = getDraggableItemStyles({
      ...baseProps,
      isClipPath: true,
      isClipAnimationReady: false,
    })

    expect(resizableStyle.transition).toBe('none')
    expect(innerDivStyle.transition).toBe('none')
    expect(innerDivStyle.clipPath).toBe('inset(28px 0 24px 0 round 10px)')
  })

  it('applies drag transform to the shared frame', () => {
    const { frameStyle, innerDivStyle } = getDraggableItemStyles({
      ...baseProps,
      isClipPath: false,
      isClipAnimationReady: true,
      transform: { x: 12, y: 8 },
    })

    expect(frameStyle.transform).toBe('translate3d(12px, 8px, 0)')
    expect(innerDivStyle.transform).toBeUndefined()
  })

  it('animates top/height and clip-path after priming', () => {
    const { resizableStyle, innerDivStyle } = getDraggableItemStyles({
      ...baseProps,
      isClipPath: true,
      isClipAnimationReady: true,
    })

    expect(resizableStyle.transition).toBe(`top ${CLIP_GEOMETRY_TRANSITION}, height ${CLIP_GEOMETRY_TRANSITION}`)
    expect(innerDivStyle.transition).toBe(`clip-path ${CLIP_GEOMETRY_TRANSITION}`)
  })

  it('omits height transition while resizing', () => {
    const { resizableStyle } = getDraggableItemStyles({
      ...baseProps,
      isClipPath: true,
      isClipAnimationReady: true,
      isResizing: true,
    })

    expect(resizableStyle.transition).toBe(`top ${CLIP_GEOMETRY_TRANSITION}`)
  })

  it('omits top transition when disableTopTransition is enabled', () => {
    const { resizableStyle } = getDraggableItemStyles({
      ...baseProps,
      isClipPath: true,
      isClipAnimationReady: true,
      disableTopTransition: true,
    })

    expect(resizableStyle.transition).toBe(`height ${CLIP_GEOMETRY_TRANSITION}`)
  })
})
