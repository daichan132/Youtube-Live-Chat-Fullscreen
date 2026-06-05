import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { type IconType, TbDeviceDesktop, TbMoon, TbSun } from '@/shared/components/icons'
import type { ThemeMode } from '@/shared/theme'

interface ThemeModeSegmentedControlProps {
  value: ThemeMode
  onChange: (themeMode: ThemeMode) => void
  ariaLabel?: string
}

const themeModeOptions: { mode: ThemeMode; icon: IconType }[] = [
  { mode: 'system', icon: TbDeviceDesktop },
  { mode: 'light', icon: TbSun },
  { mode: 'dark', icon: TbMoon },
]

export const ThemeModeSegmentedControl = ({ value, onChange, ariaLabel }: ThemeModeSegmentedControlProps) => {
  const { t } = useTranslation()
  const groupName = useId()

  return (
    <fieldset className='ylc-theme-segment'>
      <legend className='ylc-visually-hidden'>{ariaLabel ?? t('content.setting.theme')}</legend>
      {themeModeOptions.map(({ mode, icon: Icon }) => {
        const label = t(`content.setting.themeMode.${mode}`)
        return (
          <label key={mode} className='ylc-theme-segment-option'>
            <input type='radio' name={groupName} value={mode} checked={value === mode} aria-label={label} onChange={() => onChange(mode)} />
            <Icon size={18} aria-hidden='true' />
          </label>
        )
      })}
    </fieldset>
  )
}
