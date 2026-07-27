import { useSetAtom } from 'jotai'
import { useCallback } from 'react'
import { useStyleHistoryCommands } from '@/entrypoints/content/features/YTDLiveChatSetting/styleHistoryCommands'
import { TbPlus } from '@/shared/components/icons'
import { useT } from '@/shared/i18n/react'
import { addPresetAtom } from '@/shared/state'

export const AddPresetItem = () => {
  const addPreset = useSetAtom(addPresetAtom)
  const { getEffectiveChatProfile } = useStyleHistoryCommands()
  const t = useT()
  const addItem = useCallback(() => {
    addPreset({
      kind: 'custom',
      id: crypto.randomUUID(),
      name: t('content.preset.addItemTitle'),
      profile: getEffectiveChatProfile(),
    })
  }, [addPreset, t])
  return (
    <button type='button' className='ylc-add-preset' onClick={addItem}>
      <TbPlus size={18} aria-hidden='true' />
      {t('content.preset.addMessage')}
    </button>
  )
}
