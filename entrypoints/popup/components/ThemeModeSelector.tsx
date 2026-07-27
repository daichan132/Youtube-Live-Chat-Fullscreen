import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'
import { ThemeModeSegmentedControl } from '@/shared/components/ThemeModeSegmentedControl'
import { setThemeModeAtom, themeModeAtom } from '@/shared/state'
import type { ThemeMode } from '@/shared/theme'

export const ThemeModeSelector = () => {
  const themeMode = useAtomValue(themeModeAtom)
  const setThemeMode = useSetAtom(setThemeModeAtom)

  const handleThemeChange = useCallback(
    (nextThemeMode: ThemeMode) => {
      setThemeMode(nextThemeMode)
    },
    [setThemeMode],
  )

  return <ThemeModeSegmentedControl value={themeMode} onChange={handleThemeChange} />
}
