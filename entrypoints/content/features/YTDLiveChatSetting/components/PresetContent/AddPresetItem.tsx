import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getEffectiveChatProfile } from '@/entrypoints/content/features/YTDLiveChatSetting/styleHistoryCommands'
import { TbPlus } from '@/shared/components/icons'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'

export const AddPresetItem = () => {
  const addPreset = useChatSettingsStore(state => state.addPreset)
  const { t } = useTranslation()
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
