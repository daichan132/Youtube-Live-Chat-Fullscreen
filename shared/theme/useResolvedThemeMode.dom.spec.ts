import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ThemeMode } from './themeMode'
import { useResolvedThemeMode } from './useResolvedThemeMode'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolved theme preference', () => {
  it.each(['modern', 'legacy'] as const)('tracks System changes, preserves explicit choices, and releases its %s listener', api => {
    const target = new EventTarget()
    const add = target.addEventListener.bind(target)
    const remove = target.removeEventListener.bind(target)
    const media = Object.assign(target, {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: (listener: EventListener) => add('change', listener),
      removeListener: (listener: EventListener) => remove('change', listener),
    })
    if (api === 'legacy') Object.defineProperty(media, 'addEventListener', { value: undefined })
    const unrelatedMedia = Object.assign(new EventTarget(), { matches: false })
    vi.stubGlobal('matchMedia', (query: string) => (query === '(prefers-color-scheme: dark)' ? media : unrelatedMedia))
    const added = api === 'modern' ? vi.spyOn(media, 'addEventListener') : vi.spyOn(media, 'addListener')
    const removed = api === 'modern' ? vi.spyOn(media, 'removeEventListener') : vi.spyOn(media, 'removeListener')
    const changeSystemTheme = (dark: boolean) =>
      act(() => {
        media.matches = dark
        media.dispatchEvent(new Event('change'))
      })
    const { result, rerender, unmount } = renderHook(({ mode }: { mode: ThemeMode }) => useResolvedThemeMode(mode), {
      initialProps: { mode: 'system' as ThemeMode },
    })
    try {
      expect(result.current).toBe('light')
      changeSystemTheme(true)
      expect(result.current).toBe('dark')

      rerender({ mode: 'light' })
      expect(result.current).toBe('light')
      changeSystemTheme(false)
      changeSystemTheme(true)
      expect(result.current).toBe('light')

      rerender({ mode: 'system' })
      expect(result.current).toBe('dark')
      changeSystemTheme(false)
      expect(result.current).toBe('light')
    } finally {
      unmount()
    }
    // Assert external subscription ownership, without fixing how many reads of
    // matchMedia the hook needs to resolve the initial preference.
    expect(added.mock.calls.length).toBeGreaterThan(0)
    for (const args of added.mock.calls) {
      if (api === 'modern') expect(removed).toHaveBeenCalledWith('change', args[1])
      else expect(removed).toHaveBeenCalledWith(args[0])
    }
  })
})
