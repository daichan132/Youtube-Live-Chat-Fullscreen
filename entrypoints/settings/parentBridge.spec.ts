import { describe, expect, it } from 'vitest'
import { getAllowedParentOrigin } from './parentBridge'

describe('settings parent bridge', () => {
  it('accepts only the configured YouTube origin', () => {
    expect(getAllowedParentOrigin('chrome-extension://id/settings.html?parentOrigin=https%3A%2F%2Fwww.youtube.com')).toBe(
      'https://www.youtube.com',
    )
    expect(getAllowedParentOrigin('chrome-extension://id/settings.html?parentOrigin=https%3A%2F%2Fevil.example')).toBeNull()
  })
})
