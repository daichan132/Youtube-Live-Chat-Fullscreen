import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findFirefoxSourceZip } from './firefox-source-archive.mjs'

let directory
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'ylc-firefox-source-selection-'))
})
afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

describe('Firefox source archive selection', () => {
  it('selects the requested version when older source archives remain beside it', async () => {
    const current = join(directory, 'youtube-live-chat-fullscreen-2.3.16-sources.zip')
    const previous = join(directory, 'youtube-live-chat-fullscreen-2.3.15-sources.zip')
    await writeFile(previous, 'previous archive')
    await writeFile(current, 'current archive')
    await writeFile(join(directory, 'youtube-live-chat-fullscreen-2.3.16-firefox.zip'), 'browser archive')

    await expect(findFirefoxSourceZip(directory, '2.3.16')).resolves.toBe(current)
    expect(await readFile(previous, 'utf8')).toBe('previous archive')
    expect(await readFile(current, 'utf8')).toBe('current archive')
  })

  it('rejects a missing current archive instead of falling back to the only older source ZIP', async () => {
    const previous = join(directory, 'youtube-live-chat-fullscreen-2.3.15-sources.zip')
    await writeFile(previous, 'previous archive')

    await expect(findFirefoxSourceZip(directory, '2.3.16')).rejects.toThrow(
      `Firefox source ZIP for v2.3.16 is missing: ${join(directory, 'youtube-live-chat-fullscreen-2.3.16-sources.zip')}`,
    )
    expect(await readFile(previous, 'utf8')).toBe('previous archive')
  })
})
