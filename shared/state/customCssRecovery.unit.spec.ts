import { createStore } from 'jotai/vanilla'
import { describe, expect, it } from 'vitest'
import {
  customCssLocalStopAtom,
  customCssRecoveryAtom,
  customCssSuspendedAtom,
  isCustomCssStoppedAtom,
  receiveCustomCssSuspendedAtom,
} from './customCssAtoms'

describe('confirmed CSS recovery notifications', () => {
  it('clears a failed stop notice after a repository retry succeeds', () => {
    const store = createStore()
    store.set(customCssSuspendedAtom, false)
    store.set(customCssLocalStopAtom, true)
    store.set(customCssRecoveryAtom, { pending: false, target: true, failed: true })
    store.set(receiveCustomCssSuspendedAtom, true)
    expect(store.get(customCssRecoveryAtom)).toEqual({ pending: false, target: true, failed: false })
    expect(store.get(customCssLocalStopAtom)).toBe(false)
    expect(store.get(isCustomCssStoppedAtom)).toBe(true)
  })

  it('does not release a failed stop when an older resume is received', () => {
    const store = createStore()
    store.set(customCssLocalStopAtom, true)
    store.set(customCssRecoveryAtom, { pending: false, target: true, failed: true })
    store.set(receiveCustomCssSuspendedAtom, false)
    expect(store.get(isCustomCssStoppedAtom)).toBe(true)
    expect(store.get(customCssRecoveryAtom).failed).toBe(true)
  })

  it('keeps the identity of a pending recovery for its action to settle', () => {
    const store = createStore()
    const request = { pending: true, target: false, failed: false }
    store.set(customCssLocalStopAtom, true)
    store.set(customCssRecoveryAtom, request)
    store.set(receiveCustomCssSuspendedAtom, false)
    expect(store.get(customCssRecoveryAtom)).toBe(request)
    expect(store.get(customCssLocalStopAtom)).toBe(true)
  })

  it('settles an explicitly retried resume when its confirmed value arrives', () => {
    const store = createStore()
    store.set(customCssLocalStopAtom, true)
    store.set(customCssRecoveryAtom, { pending: false, target: false, failed: true })
    store.set(receiveCustomCssSuspendedAtom, false)
    expect(store.get(customCssRecoveryAtom)).toEqual({ pending: false, target: false, failed: false })
    expect(store.get(isCustomCssStoppedAtom)).toBe(false)
  })
})
