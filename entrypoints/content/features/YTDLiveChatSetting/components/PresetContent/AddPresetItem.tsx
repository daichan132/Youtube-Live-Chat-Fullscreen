import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'
import { useStyleHistoryCommands } from '@/entrypoints/content/features/YTDLiveChatSetting/styleHistoryCommands'
import { TbPlus } from '@/shared/components/icons'
import { useT } from '@/shared/i18n/react'
import { MAX_CUSTOM_PRESETS } from '@/shared/settings/persistConfig'
import { addPresetAtom, presetsAtom } from '@/shared/state'

export const AddPresetItem = () => {
  const presets = useAtomValue(presetsAtom)
  const addPreset = useSetAtom(addPresetAtom)
  const { getEffectiveChatProfile } = useStyleHistoryCommands()
  const t = useT()
  const atLimit = presets.filter(preset => preset.kind === 'custom').length >= MAX_CUSTOM_PRESETS
  const addItem = useCallback(() => {
    if (atLimit) return
    addPreset({
      kind: 'custom',
      id: crypto.randomUUID(),
      name: t('content.preset.addItemTitle'),
      profile: getEffectiveChatProfile(),
    })
  }, [addPreset, atLimit, getEffectiveChatProfile, t])

  return (
    <button type='button' data-ylc-add-preset className='ylc-add-preset' onClick={addItem} disabled={atLimit}>
      <TbPlus size={18} aria-hidden='true' />
      {t('content.preset.addMessage')}
    </button>
  )
}
