import { describe, expect, it } from 'vitest'
import { assertCustomCss, assertSavedChatCss, DEFAULT_CUSTOM_CSS, isCustomCssWithinLimit, normalizeCustomCss,
  readCustomCssBackup } from './customCss'
import { buildSettingsBackup, normalizeSettingsBackup } from './backup'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'

const current = { globalSetting: { ytdLiveChat: true, themeMode: 'system' }, chatSettings: DEFAULT_CHAT_SETTINGS }

describe('independent chat CSS settings', () => {
  it('starts disabled and preserves exact source, including whitespace', () => {
    expect(normalizeCustomCss(undefined)).toEqual(DEFAULT_CUSTOM_CSS)
    const css = '\n/* author comment */\nbody { color: red }\r\n'
    expect(normalizeCustomCss({ enabled: true, css })).toEqual({ enabled: true, css })
  })
  it('measures UTF-8 bytes and never truncates oversized stored source', () => {
    expect(isCustomCssWithinLimit('あ'.repeat(21845))).toBe(true)
    const css = 'あ'.repeat(21846)
    expect(isCustomCssWithinLimit(css)).toBe(false)
    expect(normalizeCustomCss({ enabled: true, css })).toEqual({ enabled: false, css })
  })
  it('accounts for JSON escaping independently from source length', () => {
    expect(() => assertCustomCss({ enabled: false, css: '\0'.repeat(64 * 1024) })).toThrow('too-large')
  })
  it('rejects duplicate IDs and over-limit libraries instead of silently dropping entries', () => {
    const entry = { id: 'one', name: 'Bubble', css: 'body{}' }
    expect(() => assertSavedChatCss([entry, entry])).toThrow('invalid')
    expect(() => assertSavedChatCss(Array.from({ length: 21 }, (_, i) => ({ ...entry, id: `${i}` })))).toThrow('library-full')
  })
  it('imports source text without allowing execution or importing a stop override', () => {
    const imported = readCustomCssBackup({ customCss: { enabled: true, css: 'body{}' },
      savedChatCss: [{ id: 'one', name: 'Sample', css: '#message{}', enabled: true }], customCssSuspended: false })
    expect(imported).toEqual({ customCss: { enabled: false, css: 'body{}' },
      savedChatCss: [{ id: 'one', name: 'Sample', css: '#message{}' }] })
  })
  it('round-trips a version 3 backup while deliberately disabling imported CSS', () => {
    const backup = buildSettingsBackup({ ...current, customCss: { enabled: true, css: 'body{}' },
      savedChatCss: [{ id: 'one', name: 'Sample', css: '#message{}' }] })
    expect(backup).not.toHaveProperty('customCssSuspended')
    const imported = normalizeSettingsBackup(backup, current)
    expect(imported?.customCss).toEqual({ enabled: false, css: 'body{}' })
    expect(imported?.savedChatCss).toEqual(backup.savedChatCss)
    expect(imported?.chatSettings).toEqual(current.chatSettings)
  })
  it('still accepts version 2 and does not interpret new fields on old backups', () => {
    const imported = normalizeSettingsBackup({ version: 2, ...current, customCss: { enabled: true, css: 'body{}' } }, current)
    expect(imported?.customCss).toEqual(DEFAULT_CUSTOM_CSS)
    expect(imported?.savedChatCss).toEqual([])
  })
})


it('rejects malformed backup CSS rather than replacing it with an empty source', () => {
  expect(() => readCustomCssBackup({ customCss: { enabled: true, css: 123 }, savedChatCss: [] })).toThrow('invalid')
})

it('rejects array-shaped objects at the storage boundary', () => {
  const value = Object.assign([], { enabled: true, css: 'body{}' })
  expect(() => assertCustomCss(value)).toThrow('invalid')
  const entry = Object.assign([], { id: 'one', name: 'Name', css: 'body{}' })
  expect(() => assertSavedChatCss([entry])).toThrow('invalid')
})


it('defaults omitted backup domains but rejects explicit null or undefined domains', () => {
  expect(readCustomCssBackup({})).toEqual({ customCss: DEFAULT_CUSTOM_CSS, savedChatCss: [] })
  for (const key of ['customCss', 'savedChatCss']) {
    expect(() => readCustomCssBackup({ [key]: null })).toThrow('invalid')
    expect(() => readCustomCssBackup({ [key]: undefined })).toThrow('invalid')
  }
})
