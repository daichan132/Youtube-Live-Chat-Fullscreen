import { CSS } from '@dnd-kit/utilities'

export const useDraggableItemStyles = ({
  top,
  left,
  isClipPath,
  disableTopTransition,
  isResizing,
  transform,
  clip,
}: {
  top: number
  left: number
  isClipPath: boolean
  disableTopTransition: boolean
  isResizing: boolean
  transform: { x: number; y: number } | null
  clip: { header: number; input: number }
}) => {
  const transition = [!disableTopTransition && 'top 250ms ease', !isResizing && 'height 250ms ease'].filter(Boolean).join(', ')
  const resizableStyle = {
    top,
    left,
    transition,
    pointerEvents: isClipPath ? 'none' : 'all',
  }
  const innerDivStyle = {
    transform: transform ? CSS.Translate.toString({ ...transform, scaleX: 1, scaleY: 1 }) : '',
    clipPath: isClipPath ? `inset(${clip.header}px 0 ${clip.input}px 0 round 10px)` : 'inset(0 round 10px)',
    transition: 'clip-path 250ms ease',
  }
  return { resizableStyle, innerDivStyle }
}

export const useDraggableItemEvents = (setIsHover: (value: boolean) => void) => {
  const handleMouseEnter = () => setIsHover(true)
  const handleMouseLeave = () => setIsHover(false)
  return { handleMouseEnter, handleMouseLeave }
}
