import { CSS } from '@dnd-kit/utilities'
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

export const getDraggableItemStyles = ({ top, left, transform }: DraggableItemStylesProps): StyleResults => {
  return {
    frameStyle: {
      transform: transform ? CSS.Translate.toString({ ...transform, scaleX: 1, scaleY: 1 }) : '',
    },
    resizableStyle: {
      top,
      left,
      pointerEvents: 'auto',
    },
    innerDivStyle: {
      overflow: 'hidden',
      borderRadius: 6,
    },
  }
}
