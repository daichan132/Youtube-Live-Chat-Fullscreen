import { describe, expect, it } from 'vitest'
import { PRESET_ITEM_KEYS, SETTING_ITEM_KEYS } from './settingItemDefinitions'

describe('settingItemDefinitions', () => {
  it('does not expose the removed reaction button toggle in preset settings', () => {
    expect(PRESET_ITEM_KEYS as readonly string[]).not.toContain('reactionButtonDisplay')
  })

  it('keeps super chat visibility toggle only in the editable settings list', () => {
    expect(PRESET_ITEM_KEYS as readonly string[]).not.toContain('superChatBarDisplay')
    expect(SETTING_ITEM_KEYS as readonly string[]).toContain('superChatBarDisplay')
  })
})
