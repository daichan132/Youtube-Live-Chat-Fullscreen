import { useEffect } from 'react'
import { useMessage } from '@/shared/hooks/useMessage'
import { useGlobalSettingStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'

export const useThemeMode = () => {
  const themeMode = useGlobalSettingStore(state => state.themeMode)
  const setThemeMode = useGlobalSettingStore(state => state.setThemeMode)
  const { message: themeModeMessage } = useMessage<{ message: 'themeMode'; themeMode: ThemeMode }>()

  useEffect(() => {
    if (themeModeMessage?.message === 'themeMode') {
      setThemeMode(themeModeMessage.themeMode)
    }
  }, [setThemeMode, themeModeMessage])

  return [themeMode, setThemeMode] as const
}
