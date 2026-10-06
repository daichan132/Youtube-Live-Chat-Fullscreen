import { createStore } from 'jotai/vanilla'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { applyPresetAtom, commitStylePatchAtom, undoStyleAtom } from './commands'
import { appliedChatCssAtom, customCssAtom, customCssDraftAtom, customCssSuspendedAtom, savedChatCssAtom } from './customCssAtoms'

describe('CSS does not belong to appearance presets or history', () => {
  it('does not reset CSS, library or stop preference on appearance edits and undo', () => {
    const store = createStore()
    const active = { enabled: true, css: '#message { color:red }' }
    const entries = [{ id: 'one', name: 'A', css: 'body{}' }]
    store.set(customCssAtom, active)
    store.set(savedChatCssAtom, entries)
    store.set(customCssSuspendedAtom, true)
    store.set(commitStylePatchAtom, { appearance: { fontSize: 30 } })
    store.set(undoStyleAtom)
    store.set(applyPresetAtom, DEFAULT_CHAT_PROFILE)
    expect(store.get(customCssAtom)).toEqual(active)
    expect(store.get(savedChatCssAtom)).toEqual(entries)
    expect(store.get(appliedChatCssAtom)).toBe('')
    store.set(customCssSuspendedAtom, false)
    expect(store.get(appliedChatCssAtom)).toBe(active.css)
  })
  it('keeps editor drafts distinct from persisted and rendered CSS', () => {
    const store = createStore()
    store.set(customCssSuspendedAtom, false)
    store.set(customCssDraftAtom, { css: 'new CSS', baseline: { enabled: false, css: '' } })
    expect(store.get(customCssAtom).css).toBe('')
    expect(store.get(appliedChatCssAtom)).toBe('')
  })
})
