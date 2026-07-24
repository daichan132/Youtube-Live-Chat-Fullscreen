import { useCallback } from 'react'
import { ThemeModeSegmentedControl } from '@/shared/components/ThemeModeSegmentedControl'
import { useGlobalSettingStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'

export const ThemeModeSelector = () => {
  const themeMode = useGlobalSettingStore(state => state.themeMode)
  const setThemeMode = useGlobalSettingStore(state => state.setThemeMode)

  const handleThemeChange = useCallback(
    (nextThemeMode: ThemeMode) => {
      setThemeMode(nextThemeMode)
    },
    [setThemeMode],
  )

  return <ThemeModeSegmentedControl value={themeMode} onChange={handleThemeChange} />
}
