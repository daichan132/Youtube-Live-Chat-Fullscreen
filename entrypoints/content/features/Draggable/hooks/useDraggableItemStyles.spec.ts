import { describe, expect, it } from 'vitest'
import { CLIP_GEOMETRY_TRANSITION } from '../constants/animation'
import { useDraggableItemStyles } from './useDraggableItemStyles'

const baseProps = {
  top: 20,
  left: 10,
  disableTopTransition: false,
  isResizing: false,
  transform: null,
  clip: { header: 32, input: 20 },
}

describe('useDraggableItemStyles', () => {
  it('disables geometry animation on the first clip frame', () => {
    const { resizableStyle, innerDivStyle } = useDraggableItemStyles({
      ...baseProps,
      isClipPath: true,
      isClipAnimationReady: false,
    })

    expect(resizableStyle.transition).toBe('none')
    expect(innerDivStyle.transition).toBe('none')
    expect(innerDivStyle.clipPath).toBe('inset(32px 0 20px 0 round 10px)')
  })

  it('animates top/height and clip-path after priming', () => {
    const { resizableStyle, innerDivStyle } = useDraggableItemStyles({
      ...baseProps,
      isClipPath: true,
      isClipAnimationReady: true,
    })

    expect(resizableStyle.transition).toBe(`top ${CLIP_GEOMETRY_TRANSITION}, height ${CLIP_GEOMETRY_TRANSITION}`)
    expect(innerDivStyle.transition).toBe(`clip-path ${CLIP_GEOMETRY_TRANSITION}`)
  })

  it('omits height transition while resizing', () => {
    const { resizableStyle } = useDraggableItemStyles({
      ...baseProps,
      isClipPath: true,
      isClipAnimationReady: true,
      isResizing: true,
    })

    expect(resizableStyle.transition).toBe(`top ${CLIP_GEOMETRY_TRANSITION}`)
  })

  it('omits top transition when disableTopTransition is enabled', () => {
    const { resizableStyle } = useDraggableItemStyles({
      ...baseProps,
      isClipPath: true,
      isClipAnimationReady: true,
      disableTopTransition: true,
    })

    expect(resizableStyle.transition).toBe(`height ${CLIP_GEOMETRY_TRANSITION}`)
  })
})
