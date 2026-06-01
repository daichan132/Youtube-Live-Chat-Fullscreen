import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import { CLIP_GEOMETRY_TRANSITION } from '../constants/animation'

interface Transform {
  x: number
  y: number
}

interface Clip {
  header: number
  input: number
}

interface DraggableItemStylesProps {
  top: number
  left: number
  isClipPath: boolean
  isClipAnimationReady: boolean
  disableTopTransition: boolean
  isResizing: boolean
  transform: Transform | null
  clip: Clip
}

interface StyleResults {
  frameStyle: CSSProperties
  resizableStyle: CSSProperties
  innerDivStyle: CSSProperties
}

export const getDraggableItemStyles = ({
  top,
  left,
  isClipPath,
  isClipAnimationReady,
  disableTopTransition,
  isResizing,
  transform,
  clip,
}: DraggableItemStylesProps): StyleResults => {
  const shouldAnimateGeometry = isClipAnimationReady || !isClipPath
  const transitionProperties = [
    !disableTopTransition && `top ${CLIP_GEOMETRY_TRANSITION}`,
    !isResizing && `height ${CLIP_GEOMETRY_TRANSITION}`,
  ]
    .filter(Boolean)
    .join(', ')
  const transition = shouldAnimateGeometry && transitionProperties.length > 0 ? transitionProperties : 'none'

  return {
    frameStyle: {
      transform: transform ? CSS.Translate.toString({ ...transform, scaleX: 1, scaleY: 1 }) : '',
    },
    resizableStyle: {
      top,
      left,
      transition,
      pointerEvents: isClipPath ? 'none' : 'auto',
    },
    innerDivStyle: {
      clipPath: isClipPath ? `inset(${clip.header}px 0 ${clip.input}px 0 round 10px)` : 'inset(0 round 10px)',
      transition: shouldAnimateGeometry ? `clip-path ${CLIP_GEOMETRY_TRANSITION}` : 'none',
    },
  }
}
