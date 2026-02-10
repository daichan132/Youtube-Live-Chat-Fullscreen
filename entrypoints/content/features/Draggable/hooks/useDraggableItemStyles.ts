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

interface UseDraggableItemStylesProps {
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
  resizableStyle: CSSProperties
  innerDivStyle: CSSProperties
}

/**
 * Hook that generates styles for the draggable item container and its inner content
 */
export const useDraggableItemStyles = ({
  top,
  left,
  isClipPath,
  isClipAnimationReady,
  disableTopTransition,
  isResizing,
  transform,
  clip,
}: UseDraggableItemStylesProps): StyleResults => {
  const shouldAnimateGeometry = isClipAnimationReady || !isClipPath
  const transitionProperties = [
    !disableTopTransition && `top ${CLIP_GEOMETRY_TRANSITION}`,
    !isResizing && `height ${CLIP_GEOMETRY_TRANSITION}`,
  ]
    .filter(Boolean)
    .join(', ')
  const transition = shouldAnimateGeometry && transitionProperties.length > 0 ? transitionProperties : 'none'

  // Styles for the resizable container
  const resizableStyle = {
    top,
    left,
    transition,
    pointerEvents: isClipPath ? ('none' as const) : ('auto' as const),
  }

  // Styles for the inner div
  const innerDivStyle = {
    transform: transform ? CSS.Translate.toString({ ...transform, scaleX: 1, scaleY: 1 }) : '',
    clipPath: isClipPath ? `inset(${clip.header}px 0 ${clip.input}px 0 round 10px)` : 'inset(0 round 10px)',
    transition: shouldAnimateGeometry ? `clip-path ${CLIP_GEOMETRY_TRANSITION}` : 'none',
  }

  return { resizableStyle, innerDivStyle }
}

/**
 * Hook that provides event handlers for mouse interactions
 */
export const useDraggableItemEvents = (setIsHover: (value: boolean) => void) => {
  const handleMouseEnter = () => setIsHover(true)
  const handleMouseLeave = () => setIsHover(false)

  return { handleMouseEnter, handleMouseLeave }
}
