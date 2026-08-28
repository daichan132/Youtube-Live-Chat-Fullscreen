import { describe, expect, it } from 'vitest'
import { getAllowedParentOrigin, isTrustedParentMessage } from './parentBridge'

describe('settings parent bridge', () => {
  it('accepts only the configured YouTube origin', () => {
    expect(getAllowedParentOrigin('chrome-extension://id/settings.html?parentOrigin=https%3A%2F%2Fwww.youtube.com')).toBe(
      'https://www.youtube.com',
    )
    expect(getAllowedParentOrigin('chrome-extension://id/settings.html?parentOrigin=https%3A%2F%2Fevil.example')).toBeNull()
  })

  it('requires both the expected source and origin', () => {
    const parent = window
    expect(
      isTrustedParentMessage(
        new MessageEvent('message', { source: parent, origin: 'https://www.youtube.com' }),
        'https://www.youtube.com',
        parent,
      ),
    ).toBe(true)
    expect(
      isTrustedParentMessage(
        new MessageEvent('message', { source: parent, origin: 'https://evil.example' }),
        'https://www.youtube.com',
        parent,
      ),
    ).toBe(false)
  })
})
