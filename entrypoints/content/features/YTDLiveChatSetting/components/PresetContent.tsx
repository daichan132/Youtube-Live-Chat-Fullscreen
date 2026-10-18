import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useState } from 'react'
import { formatMessage } from '@/shared/i18n/format'
import { useT } from '@/shared/i18n/react'
import { presetsAtom, reorderPresetsAtom } from '@/shared/state'
import { AddPresetItem } from './PresetContent/AddPresetItem'
import { PresetDragPreview } from './PresetContent/PresetDragPreview'
import { PresetItem } from './PresetContent/PresetItem'
import { getPresetDisplayTitle } from './PresetContent/presetDisplayTitle'
import { usePresetReorder } from './PresetContent/usePresetReorder'

export const PresetContent = () => {
  const [focusPresetId, setFocusPresetId] = useState<string | null>(null)
  const finishNameFocus = useCallback(() => setFocusPresetId(null), [])
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

  const draggedPreset = presets.find(preset => preset.id === reorder.pointerPreview?.id)
  return (
    <div className={reorder.pointerPreview ? 'ylc-preset-list ylc-preset-list-dragging' : 'ylc-preset-list'}>
      <div aria-live='polite' className='ylc-visually-hidden'>
        {reorder.liveMessage}
      </div>
      {reorder.previewIds.map(id => (
        <PresetItem
          key={id}
          id={id}
          reorder={reorder}
          focusName={focusPresetId === id}
          pointerDragging={reorder.pointerPreview?.id === id}
          onNameFocused={finishNameFocus}
        />
      ))}
      <AddPresetItem onCreated={setFocusPresetId} />
      {reorder.pointerPreview ? (
        <PresetDragPreview
          preview={reorder.pointerPreview}
          name={getPresetDisplayTitle(draggedPreset, t) || t('content.preset.addItemTitle')}
        />
      ) : null}
    </div>
  )
}
