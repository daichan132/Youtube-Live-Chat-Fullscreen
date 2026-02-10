export type ThemeMode = 'light' | 'dark' | 'system'

export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>

export const resolveThemeMode = (themeMode: ThemeMode, systemTheme: ResolvedThemeMode): ResolvedThemeMode => {
  if (themeMode === 'system') {
    return systemTheme
  }
  return themeMode
}

export const getSystemThemeMode = (): ResolvedThemeMode => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
