import { useEffect, useState } from 'react'
import { getSystemThemeMode, type ResolvedThemeMode, resolveThemeMode, type ThemeMode } from './themeMode'

const mediaQuery = '(prefers-color-scheme: dark)'

export const useResolvedThemeMode = (themeMode: ThemeMode): ResolvedThemeMode => {
  const [resolvedThemeMode, setResolvedThemeMode] = useState<ResolvedThemeMode>(() => resolveThemeMode(themeMode, getSystemThemeMode()))

  useEffect(() => {
    if (themeMode !== 'system') {
      setResolvedThemeMode(themeMode)
      return
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setResolvedThemeMode('light')
      return
    }

    const media = window.matchMedia(mediaQuery)
    const updateTheme = () => {
      setResolvedThemeMode(media.matches ? 'dark' : 'light')
    }

    updateTheme()

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updateTheme)
      return () => media.removeEventListener('change', updateTheme)
    }

    media.addListener(updateTheme)
    return () => media.removeListener(updateTheme)
  }, [themeMode])

  return resolvedThemeMode
}
