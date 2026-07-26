import { closestCenter, DndContext, type DragEndEvent, MeasuringStrategy } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'
import { useCallback } from 'react'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { AddPresetItem } from './PresetContent/AddPresetItem'
import { PresetItem } from './PresetContent/PresetItem'

const measuringConfig = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
}

const dndModifiers = [restrictToVerticalAxis, restrictToParentElement]

export const PresetContent = () => {
  const presets = useChatSettingsStore(state => state.presets)
  const reorderPresets = useChatSettingsStore(state => state.reorderPresets)
  const presetIds = presets.map(preset => preset.id)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over == null || active.id === over.id) {
        return
      }
      const currentIds = useChatSettingsStore.getState().presets.map(preset => preset.id)
      const oldIndex = currentIds.indexOf(String(active.id))
      const newIndex = currentIds.indexOf(String(over.id))
      reorderPresets(arrayMove(currentIds, oldIndex, newIndex))
    },
    [reorderPresets],
  )

  return (
    <>
      <DndContext collisionDetection={closestCenter} modifiers={dndModifiers} measuring={measuringConfig} onDragEnd={handleDragEnd}>
        <SortableContext items={presetIds}>
          {presetIds.map(id => (
            <PresetItem key={id} id={id} />
          ))}
        </SortableContext>
      </DndContext>
      <AddPresetItem />
    </>
  )
}
