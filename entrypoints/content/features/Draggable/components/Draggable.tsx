import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import type { ReactNode } from 'react'

import { useYTDLiveChatStore } from '@/shared/stores'

import { DraggableItem } from './DraggableItem'

const DRAG_MODIFIERS = [restrictToWindowEdges]

interface DraggableProps {
  children: ReactNode
}

export const Draggable = ({ children }: DraggableProps) => {
  const setCoordinates = useYTDLiveChatStore(state => state.setCoordinates)

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta } = event
    const { coordinates } = useYTDLiveChatStore.getState()
    setCoordinates({
      x: coordinates.x + delta.x,
      y: coordinates.y + delta.y,
    })
  }

  return (
    <div className='absolute overflow-hidden top-0 left-0 w-screen h-screen' style={{ pointerEvents: 'none' }}>
      <DndContext onDragEnd={handleDragEnd} modifiers={DRAG_MODIFIERS}>
        <DraggableItem>{children}</DraggableItem>
      </DndContext>
    </div>
  )
}
