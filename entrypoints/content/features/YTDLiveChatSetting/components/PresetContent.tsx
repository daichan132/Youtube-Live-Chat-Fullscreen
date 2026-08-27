import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'
import { formatMessage } from '@/shared/i18n/format'
import { useT } from '@/shared/i18n/react'
import { presetsAtom, reorderPresetsAtom } from '@/shared/state'
import { AddPresetItem } from './PresetContent/AddPresetItem'
import { PresetItem } from './PresetContent/PresetItem'
import { getPresetDisplayTitle } from './PresetContent/presetDisplayTitle'
import { usePresetReorder } from './PresetContent/usePresetReorder'

export const PresetContent = () => {
  const presets = useAtomValue(presetsAtom)
  const reorderPresets = useSetAtom(reorderPresetsAtom)
  const t = useT()
  const ids = presets.map(preset => preset.id)
  const describeMove = useCallback(
    (id: string, position: number) =>
      formatMessage(t('content.aria.presetMoved'), {
        name: getPresetDisplayTitle(
          presets.find(preset => preset.id === id),
          t,
        ),
        position,
      }),
    [presets, t],
  )
  const reorder = usePresetReorder({ ids, onCommit: reorderPresets, describeMove })

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
