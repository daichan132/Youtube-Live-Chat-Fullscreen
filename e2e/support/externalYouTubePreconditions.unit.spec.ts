import { errors } from '@playwright/test'
import { describe, expect, it } from 'vitest'
import { meetsExternalYouTubePrecondition } from './externalYouTubePreconditions'

describe('external YouTube preconditions', () => {
  it('accepts a completed external wait', async () => {
    await expect(meetsExternalYouTubePrecondition('fullscreen-ui', async () => {})).resolves.toBe(true)
  })

  it('permits a skip when a YouTube-owned UI wait times out', async () => {
    await expect(
      meetsExternalYouTubePrecondition('native-chat-frame', async () => {
        throw new errors.TimeoutError('YouTube did not expose its native chat frame')
      }),
    ).resolves.toBe(false)
  })

  it.each([
    new TypeError('Broken test helper'),
    new ReferenceError('Missing test fixture'),
    new Error('Browser connection closed'),
    Object.assign(new Error('Not a Playwright timeout'), { name: 'TimeoutError' }),
  ])('does not turn an unexpected $name into an unavailable source', async error => {
    await expect(
      meetsExternalYouTubePrecondition('native-chat-source', async () => {
        throw error
      }),
    ).rejects.toBe(error)
  })
})
