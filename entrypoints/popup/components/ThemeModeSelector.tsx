import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ThemeModeSegmentedControl } from '@/shared/components/ThemeModeSegmentedControl'
import { useGlobalSettingStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'

export const ThemeModeSelector = () => {
  const { themeMode, setThemeMode } = useGlobalSettingStore(
    useShallow(state => ({
      themeMode: state.themeMode,
      setThemeMode: state.setThemeMode,
    })),
  )

  const handleThemeChange = useCallback(
    (nextThemeMode: ThemeMode) => {
      setThemeMode(nextThemeMode)
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            message: 'themeMode',
            themeMode: nextThemeMode,
          })
        }
      })
    },
    [setThemeMode],
  )

  return <ThemeModeSegmentedControl value={themeMode} onChange={handleThemeChange} fill />
}
