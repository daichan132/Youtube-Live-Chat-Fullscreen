import type { PointerEventHandler } from 'react'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import type { ResizeDirection } from '../features/Draggable/hooks/clipGeometry'

const DIRECTIONS: ResizeDirection[] = ['top', 'right', 'bottom', 'left', 'topRight', 'bottomRight', 'bottomLeft', 'topLeft']

const HANDLE_CLASS: Record<ResizeDirection, string> = {
  // Include the painted border without covering native controls at its inside edge.
  top: 'absolute -top-[22px] left-0.5 right-0.5 h-6 cursor-n-resize',
  right: 'absolute -right-[22px] top-0.5 bottom-0.5 w-6 cursor-e-resize',
  bottom: 'absolute -bottom-[22px] left-0.5 right-0.5 h-6 cursor-s-resize',
  left: 'absolute -left-[22px] top-0.5 bottom-0.5 w-6 cursor-w-resize',
  topRight: 'absolute -right-[22px] -top-[22px] size-6 cursor-ne-resize',
  bottomRight: 'absolute -right-[22px] -bottom-[22px] size-6 cursor-se-resize',
  bottomLeft: 'absolute -left-[22px] -bottom-[22px] size-6 cursor-sw-resize',
  topLeft: 'absolute -left-[22px] -top-[22px] size-6 cursor-nw-resize',
}

export const ResizeHandles = ({ onPointerDown }: { onPointerDown: PointerEventHandler<HTMLElement> }) => (
  <>
    {DIRECTIONS.map(direction => (
      <div
        key={direction}
        data-ylc-resize-direction={direction}
        aria-hidden='true'
        className={`${HANDLE_CLASS[direction]} touch-none select-none`}
        style={{ pointerEvents: 'auto', zIndex: CHAT_PANEL_LAYER.interactionOverlay }}
        onPointerDown={onPointerDown}
      />
    ))}
  </>
)
