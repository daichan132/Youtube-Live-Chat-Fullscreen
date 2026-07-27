import type { CSSProperties } from 'react'

interface Transform {
  x: number
  y: number
}
interface DraggableItemStylesProps {
  top: number
  left: number
  transform: Transform | null
}
interface StyleResults {
  frameStyle: CSSProperties
  resizableStyle: CSSProperties
  innerDivStyle: CSSProperties
}

export const getDraggableItemStyles = ({ top, left, transform }: DraggableItemStylesProps): StyleResults => ({
  frameStyle: { transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : '' },
  resizableStyle: { top, left, pointerEvents: 'auto' },
  innerDivStyle: { overflow: 'hidden', borderRadius: 6 },
})
