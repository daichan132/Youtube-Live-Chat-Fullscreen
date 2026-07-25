import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import type { ReactNode } from 'react'
import { fitGeometryToViewport } from '@/shared/settings/fitGeometryToViewport'
import { useYTDLiveChatStore } from '@/shared/stores'

import { DraggableItem } from './DraggableItem'

const DRAG_MODIFIERS = [restrictToWindowEdges]

interface DraggableProps {
  children: ReactNode
  initialDisplayOnMount?: boolean
}

export const Draggable = ({ children, initialDisplayOnMount = false }: DraggableProps) => {
  const handleDragEnd = (event: DragEndEvent) => {
    const { delta } = event
    const { coordinates, size, setGeometry } = useYTDLiveChatStore.getState()
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const displayGeometry = fitGeometryToViewport({ coordinates, size }, viewport, 10)
    setGeometry(
      fitGeometryToViewport(
        {
          coordinates: {
            x: displayGeometry.coordinates.x + delta.x,
            y: displayGeometry.coordinates.y + delta.y,
          },
          size: displayGeometry.size,
        },
        viewport,
        10,
      ),
    )
  }

  return (
    <div className='absolute overflow-hidden top-0 left-0 w-screen h-screen' style={{ pointerEvents: 'none' }}>
      <DndContext onDragEnd={handleDragEnd} modifiers={DRAG_MODIFIERS}>
        <DraggableItem initialDisplayOnMount={initialDisplayOnMount}>{children}</DraggableItem>
      </DndContext>
    </div>
  )
}
