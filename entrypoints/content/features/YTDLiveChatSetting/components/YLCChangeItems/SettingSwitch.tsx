import { useId } from 'react'
import { Switch } from '@/shared/components/Switch'

export const SettingSwitch = ({
  checked,
  onChange,
  'aria-label': ariaLabel,
}: {
  checked: boolean
  onChange?: (checked: boolean) => void
  'aria-label'?: string
}) => {
  const id = useId()
  return (
    <div className='ylc-action-fill ylc-action-inner'>
      <Switch
        checked={checked}
        id={id}
        aria-label={ariaLabel}
        onChange={value => {
          onChange?.(value)
        }}
      />
    </div>
  )
}
