import { describe, expect, it } from 'vitest'
import { CHAT_CSS_PRESETS } from './chatCssPresets'
import { assertCustomCss } from './customCss'

describe('packaged chat CSS catalog', () => {
  it('has nonempty, unique IDs and nonidentical CSS sources', () => {
    expect(CHAT_CSS_PRESETS.length).toBeGreaterThan(0)
    expect(new Set(CHAT_CSS_PRESETS.map(preset => preset.id)).size).toBe(CHAT_CSS_PRESETS.length)
    expect(new Set(CHAT_CSS_PRESETS.map(preset => preset.css)).size).toBe(CHAT_CSS_PRESETS.length)
  })

  it.each(CHAT_CSS_PRESETS)('$id is a normal CSS source accepted by the editor capacity boundary', preset => {
    expect(preset.id.trim()).not.toBe('')
    expect(preset.labelKey).not.toBe(preset.descriptionKey)
    expect(preset.css.trim()).not.toBe('')
    expect(() => assertCustomCss({ enabled: false, css: preset.css })).not.toThrow()
  })
})
