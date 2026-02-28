import { closestCenter, DndContext, type DragEndEvent, MeasuringStrategy } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'
import { useCallback } from 'react'
import { useYTDLiveChatStore } from '@/shared/stores'
import { AddPresetItem } from './PresetContent/AddPresetItem'
import { PresetItem } from './PresetContent/PresetItem'

const measuringConfig = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
}

const dndModifiers = [restrictToVerticalAxis, restrictToParentElement]

export const PresetContent = () => {
  const presetItemIds = useYTDLiveChatStore(state => state.presetItemIds)
  const setPresetItemIds = useYTDLiveChatStore(state => state.setPresetItemIds)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over == null || active.id === over.id) {
        return
      }
      const currentIds = useYTDLiveChatStore.getState().presetItemIds
      const oldIndex = currentIds.indexOf(String(active.id))
      const newIndex = currentIds.indexOf(String(over.id))
      setPresetItemIds(arrayMove(currentIds, oldIndex, newIndex))
    },
    [setPresetItemIds],
  )

  return (
    <>
      <DndContext collisionDetection={closestCenter} modifiers={dndModifiers} measuring={measuringConfig} onDragEnd={handleDragEnd}>
        <SortableContext items={presetItemIds}>
          {presetItemIds.map(id => (
            <PresetItem key={id} id={id} />
          ))}
        </SortableContext>
      </DndContext>
      <AddPresetItem />
    </>
  )
}
