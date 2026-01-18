import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import type { ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatStore } from '@/shared/stores'

import { DraggableItem } from './DraggableItem'

interface DraggableProps {
  children: ReactNode
}

export const Draggable = ({ children }: DraggableProps) => {
  const { coordinates, setCoordinates } = useYTDLiveChatStore(
    useShallow(state => ({
      coordinates: state.coordinates,
      setCoordinates: state.setCoordinates,
    })),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta } = event
    setCoordinates({
      x: coordinates.x + delta.x,
      y: coordinates.y + delta.y,
    })
  }

  return (
    <div className='absolute overflow-hidden top-0 left-0 w-screen h-screen' style={{ pointerEvents: 'none' }}>
      <DndContext onDragEnd={handleDragEnd} modifiers={[restrictToWindowEdges]}>
        <DraggableItem top={coordinates.y} left={coordinates.x}>
          {children}
        </DraggableItem>
      </DndContext>
    </div>
  )
}
