import { describe, expect, it } from 'vitest'
import { isRGBColor, isValidImportData, sanitizeGlobalSetting, sanitizeYLCStyle, sanitizeYTDLiveChat } from './dataTransfer'

describe('isValidImportData', () => {
  it('accepts valid data', () => {
    expect(isValidImportData({ version: 1, exportedAt: '', globalSetting: {}, ytdLiveChat: {} })).toBe(true)
  })

  it.each([
    null,
    undefined,
    42,
    'string',
    { globalSetting: {}, ytdLiveChat: {} },
    { version: 1, ytdLiveChat: {} },
    { version: 1, globalSetting: {} },
  ])('rejects %j', input => {
    expect(isValidImportData(input)).toBe(false)
  })
})

describe('isRGBColor', () => {
  it('accepts { r, g, b }', () => {
    expect(isRGBColor({ r: 255, g: 0, b: 0 })).toBe(true)
  })

  it('accepts { r, g, b, a }', () => {
    expect(isRGBColor({ r: 0, g: 0, b: 0, a: 0.5 })).toBe(true)
  })

  it.each([null, 'red', 42, { g: 0, b: 0 }])('rejects %j', v => {
    expect(isRGBColor(v)).toBe(false)
  })
})

describe('sanitizeGlobalSetting', () => {
  it('picks valid fields', () => {
    expect(sanitizeGlobalSetting({ ytdLiveChat: false, themeMode: 'dark' })).toEqual({
      ytdLiveChat: false,
      themeMode: 'dark',
    })
  })

  it.each(['light', 'dark', 'system'] as const)('accepts themeMode=%s', mode => {
    expect(sanitizeGlobalSetting({ themeMode: mode })).toEqual({ themeMode: mode })
  })

  it('ignores invalid themeMode', () => {
    expect(sanitizeGlobalSetting({ themeMode: 'neon' })).toEqual({})
  })

  it('ignores non-boolean ytdLiveChat', () => {
    expect(sanitizeGlobalSetting({ ytdLiveChat: 'yes' })).toEqual({})
  })

  it('drops unknown keys', () => {
    expect(sanitizeGlobalSetting({ extra: true, ytdLiveChat: true })).toEqual({ ytdLiveChat: true })
  })
})

describe('sanitizeYLCStyle', () => {
  it('picks valid style fields', () => {
    expect(
      sanitizeYLCStyle({
        bgColor: { r: 0, g: 0, b: 0 },
        fontSize: 14,
        blur: 5,
        alwaysOnDisplay: true,
      }),
    ).toEqual({
      bgColor: { r: 0, g: 0, b: 0 },
      fontSize: 14,
      blur: 5,
      alwaysOnDisplay: true,
    })
  })

  it('drops wrong types', () => {
    expect(sanitizeYLCStyle({ fontSize: 'big', blur: true, alwaysOnDisplay: 1 })).toEqual({})
  })

  it('drops invalid colors', () => {
    expect(sanitizeYLCStyle({ bgColor: 'red', fontColor: null })).toEqual({})
  })
})

describe('sanitizeYTDLiveChat', () => {
  it('sanitizes style + structural fields together', () => {
    expect(
      sanitizeYTDLiveChat({
        fontSize: 20,
        presetItemIds: ['a', 'b'],
        addPresetEnabled: false,
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 400 },
      }),
    ).toEqual({
      fontSize: 20,
      presetItemIds: ['a', 'b'],
      addPresetEnabled: false,
      coordinates: { x: 10, y: 20 },
      size: { width: 300, height: 400 },
    })
  })

  it('rejects non-string presetItemIds', () => {
    expect(sanitizeYTDLiveChat({ presetItemIds: [1, 2] })).toEqual({})
  })

  it('rejects coordinates missing y', () => {
    expect(sanitizeYTDLiveChat({ coordinates: { x: 10 } })).toEqual({})
  })

  it('rejects size missing height', () => {
    expect(sanitizeYTDLiveChat({ size: { width: 10 } })).toEqual({})
  })

  it('sanitizes presetItemStyles per entry', () => {
    const result = sanitizeYTDLiveChat({
      presetItemStyles: {
        a: { fontSize: 14, bgColor: { r: 0, g: 0, b: 0 } },
        b: null,
      },
    })
    expect(result.presetItemStyles).toEqual({
      a: { fontSize: 14, bgColor: { r: 0, g: 0, b: 0 } },
    })
  })

  it('sanitizes presetItemTitles dropping non-strings', () => {
    expect(sanitizeYTDLiveChat({ presetItemTitles: { a: 'ok', b: 123 } })).toEqual({
      presetItemTitles: { a: 'ok' },
    })
  })

  it('strips coordinates to x and y only', () => {
    const result = sanitizeYTDLiveChat({ coordinates: { x: 1, y: 2, extra: 3 } })
    expect(result.coordinates).toEqual({ x: 1, y: 2 })
  })

  it('strips size to width and height only', () => {
    const result = sanitizeYTDLiveChat({ size: { width: 1, height: 2, extra: 3 } })
    expect(result.size).toEqual({ width: 1, height: 2 })
  })
})
