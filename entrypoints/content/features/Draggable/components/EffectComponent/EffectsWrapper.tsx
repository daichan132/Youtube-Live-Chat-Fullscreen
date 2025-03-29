import { ClipPathEffect } from './ClipPathEffect'
import { DisplayEffect } from './DisplayEffect'
import { HoverEffect } from './HoverEffect'
import { WindowResizeEffect } from './WindowResizeEffect'

interface EffectsWrapperProps {
  isDragging: boolean
  isResizing: boolean
}

export const EffectsWrapper = ({ isDragging, isResizing }: EffectsWrapperProps) => {
  return (
    <>
      <ClipPathEffect isDragging={isDragging} isResizing={isResizing} />
      <HoverEffect isDragging={isDragging} />
      <WindowResizeEffect />
      <DisplayEffect />
    </>
  )
}
