import type { PointerEventHandler } from 'react'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import type { ResizeDirection } from '../features/Draggable/hooks/clipGeometry'

const DIRECTIONS: ResizeDirection[] = ['top', 'right', 'bottom', 'left', 'topRight', 'bottomRight', 'bottomLeft', 'topLeft']

const HANDLE_CLASS: Record<ResizeDirection, string> = {
  top: 'absolute -top-2 left-2 right-2 h-4 cursor-n-resize touch-none',
  right: 'absolute -right-2 top-2 bottom-2 w-4 cursor-e-resize touch-none',
  bottom: 'absolute -bottom-2 left-2 right-2 h-4 cursor-s-resize touch-none',
  left: 'absolute -left-2 top-2 bottom-2 w-4 cursor-w-resize touch-none',
  topRight: 'absolute -right-2 -top-2 size-4 cursor-ne-resize touch-none',
  bottomRight: 'absolute -right-2 -bottom-2 size-4 cursor-se-resize touch-none',
  bottomLeft: 'absolute -left-2 -bottom-2 size-4 cursor-sw-resize touch-none',
  topLeft: 'absolute -left-2 -top-2 size-4 cursor-nw-resize touch-none',
}

export const ResizeHandles = ({ onPointerDown }: { onPointerDown: PointerEventHandler<HTMLElement> }) => (
  <>
    {DIRECTIONS.map(direction => (
      <div
        key={direction}
        data-ylc-resize-direction={direction}
        aria-hidden='true'
        className={HANDLE_CLASS[direction]}
        style={{ pointerEvents: 'auto', zIndex: CHAT_PANEL_LAYER.interactionOverlay }}
        onPointerDown={onPointerDown}
      />
    ))}
  </>
)
