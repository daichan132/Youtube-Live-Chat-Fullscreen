import { closestCenter, DndContext, MeasuringStrategy } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'
import { useShallow } from 'zustand/react/shallow'
import { useYTDLiveChatStore } from '@/shared/stores'
import { AddPresetItem } from './PresetContent/AddPresetItem'
import { PresetItem } from './PresetContent/PresetItem'

const measuringConfig = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
}

export const PresetContent = () => {
  const { presetItemIds, setPresetItemIds } = useYTDLiveChatStore(
    useShallow(state => ({
      presetItemIds: state.presetItemIds,
      setPresetItemIds: state.setPresetItemIds,
    })),
  )
  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        measuring={measuringConfig}
        onDragEnd={event => {
          const { active, over } = event
          if (over == null || active.id === over.id) {
            return
          }
          const oldIndex = presetItemIds.findIndex(item => item === active.id)
          const newIndex = presetItemIds.findIndex(item => item === over.id)
          const newItems = arrayMove(presetItemIds, oldIndex, newIndex)
          setPresetItemIds(newItems)
        }}
      >
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
