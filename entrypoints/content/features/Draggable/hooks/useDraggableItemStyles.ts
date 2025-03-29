import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'

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
  disableTopTransition,
  isResizing,
  transform,
  clip,
}: UseDraggableItemStylesProps): StyleResults => {
  // Create transition string based on current state
  const transition = [!disableTopTransition && 'top 250ms ease', !isResizing && 'height 250ms ease'].filter(Boolean).join(', ')

  // Styles for the resizable container
  const resizableStyle = {
    top,
    left,
    transition,
    pointerEvents: isClipPath ? ('none' as const) : ('all' as const),
  }

  // Styles for the inner div
  const innerDivStyle = {
    transform: transform ? CSS.Translate.toString({ ...transform, scaleX: 1, scaleY: 1 }) : '',
    clipPath: isClipPath ? `inset(${clip.header}px 0 ${clip.input}px 0 round 10px)` : 'inset(0 round 10px)',
    transition: 'clip-path 250ms ease',
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
