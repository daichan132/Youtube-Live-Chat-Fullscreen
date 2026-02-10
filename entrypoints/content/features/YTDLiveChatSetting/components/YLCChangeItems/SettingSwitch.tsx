import { useId } from 'react'
import { Switch } from '@/shared/components/Switch'

export const SettingSwitch = ({ checked, onChange }: { checked: boolean; onChange?: (checked: boolean) => void }) => {
  const id = useId()
  return (
    <div className='ylc-action-fill ylc-action-inner'>
      <Switch
        checked={checked}
        id={id}
        onChange={value => {
          onChange?.(value)
        }}
      />
    </div>
  )
}
