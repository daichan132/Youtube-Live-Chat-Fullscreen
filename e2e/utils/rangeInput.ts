import type { Locator } from '@playwright/test'

/** Adjust a native range with one held-key gesture, preserving one undo step. */
export const setRangeWithKeyboard = async (range: Locator, value: number) => {
  const current = Number(await range.inputValue())
  const min = Number(await range.getAttribute('min'))
  const max = Number(await range.getAttribute('max'))
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Range target outside ${min}–${max}: ${value}`)
  if (current === value) return
  await range.focus()
  const keyboard = range.page().keyboard
  const key = value > current ? 'ArrowUp' : 'ArrowDown'
  try {
    for (let step = 0; step < Math.abs(value - current); step++) await keyboard.down(key)
  } finally {
    await keyboard.up(key)
  }
}
