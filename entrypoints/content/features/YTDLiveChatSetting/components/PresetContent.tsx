import { useAtomValue, useSetAtom } from 'jotai'
import { presetsAtom, reorderPresetsAtom } from '@/shared/state'
import { AddPresetItem } from './PresetContent/AddPresetItem'
import { PresetItem } from './PresetContent/PresetItem'
import { usePresetReorder } from './PresetContent/usePresetReorder'

export const PresetContent = () => {
  const presets = useAtomValue(presetsAtom)
  const reorderPresets = useSetAtom(reorderPresetsAtom)
  const ids = presets.map(preset => preset.id)
  const reorder = usePresetReorder({ ids, onCommit: reorderPresets })

  return (
    <>
      <div aria-live='polite' className='ylc-visually-hidden'>
        {reorder.liveMessage}
      </div>
      {reorder.previewIds.map(id => (
        <PresetItem key={id} id={id} reorder={reorder} />
      ))}
      <AddPresetItem />
    </>
  )
}
