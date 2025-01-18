import type React from 'react'

import { DndContext } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatStore } from '@/shared/stores'

import { DraggableItem } from './DraggableItem'

interface DraggableType {
  children: React.ReactNode
}

export const Draggable = ({ children }: DraggableType) => {
  const {
    coordinates: { x, y },
    setCoordinates,
  } = useYTDLiveChatStore(
    useShallow(state => ({
      coordinates: state.coordinates,
      setCoordinates: state.setCoordinates,
    })),
  )
  return (
    <div className='absolute overflow-hidden top-0 left-0 w-screen h-screen'>
      <DndContext
        onDragEnd={({ delta }) => {
          setCoordinates({
            x: x + delta.x,
            y: y + delta.y,
          })
        }}
        modifiers={[restrictToWindowEdges]}
      >
        <DraggableItem top={y} left={x}>
          {children}
        </DraggableItem>
      </DndContext>
    </div>
  )
}
