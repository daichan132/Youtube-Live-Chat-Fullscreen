import { useTranslation } from 'react-i18next'
import type { ThemeMode } from '@/shared/theme'

interface ThemeModeSegmentedControlProps {
  value: ThemeMode
  onChange: (themeMode: ThemeMode) => void
  ariaLabel?: string
  fill?: boolean
}

const themeModeOrder: ThemeMode[] = ['system', 'light', 'dark']

export const ThemeModeSegmentedControl = ({ value, onChange, ariaLabel, fill = false }: ThemeModeSegmentedControlProps) => {
  const { t } = useTranslation()
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as ThemeMode)
  }

  const wrapClassName = fill ? 'ylc-theme-select-wrap ylc-action-fill' : 'ylc-theme-select-wrap'
  const selectClassName = fill ? 'ylc-theme-select ylc-action-fill' : 'ylc-theme-select'

  return (
    <div className={wrapClassName}>
      <select className={selectClassName} value={value} onChange={handleChange} aria-label={ariaLabel ?? t('content.setting.theme')}>
        {themeModeOrder.map(themeMode => (
          <option key={themeMode} value={themeMode}>
            {t(`content.setting.themeMode.${themeMode}`)}
          </option>
        ))}
      </select>
    </div>
  )
}
