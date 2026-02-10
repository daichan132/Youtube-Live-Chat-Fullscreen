import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useMessage } from '@/shared/hooks/useMessage'
import { useGlobalSettingStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'

export const useThemeMode = () => {
  const { themeMode, setThemeMode } = useGlobalSettingStore(
    useShallow(state => ({
      themeMode: state.themeMode,
      setThemeMode: state.setThemeMode,
    })),
  )
  const { message: themeModeMessage } = useMessage<{ message: 'themeMode'; themeMode: ThemeMode }>()

  useEffect(() => {
    if (themeModeMessage?.message === 'themeMode') {
      setThemeMode(themeModeMessage.themeMode)
    }
  }, [setThemeMode, themeModeMessage])

  return [themeMode, setThemeMode] as const
}
