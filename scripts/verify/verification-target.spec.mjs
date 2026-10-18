import { mkdtemp, rm, symlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertVerificationProfile, commandArgument, createBackgroundPage, verifyCdpProfile } from './verification-target.mjs'

const temporary = []
afterEach(async () => {
  vi.useRealTimers()
  await Promise.all(temporary.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

const backgroundBrowser = ({ navigationError, cleanupError, attached = true } = {}) => {
  const targets = new Set(['existing'])
  const existing = { id: 'existing' }
  const owned = {
    id: 'owned',
    goto: vi.fn(async () => {
      if (navigationError) throw navigationError
    }),
  }
  const detach = vi.fn(async () => {
    if (cleanupError) throw cleanupError
  })
  const cdp = {
    send: vi.fn(async (method, options) => {
      if (method === 'Target.createTarget') {
        targets.add('owned')
        return { targetId: 'owned' }
      }
      if (method === 'Target.closeTarget') {
        if (cleanupError) throw cleanupError
        targets.delete(options.targetId)
        return { success: true }
      }
      throw new Error(`Unexpected command: ${method}`)
    }),
    detach,
  }
  const context = {
    pages: () => (attached ? [existing, owned] : []),
    newCDPSession: async page => ({ send: async () => ({ targetInfo: { targetId: page.id } }), detach }),
  }
  const browser = { newBrowserCDPSession: async () => cdp, contexts: () => [context] }
  return { browser, targets, owned, cdp }
}

describe('owned background target lifetime', () => {
  it('closes only its own target when navigation fails', async () => {
    const navigationError = new Error('navigation failed')
    const fixture = backgroundBrowser({ navigationError })

    await expect(createBackgroundPage(fixture.browser, 'https://example.invalid/')).rejects.toBe(navigationError)

    expect([...fixture.targets]).toEqual(['existing'])
    expect(fixture.cdp.send).toHaveBeenCalledWith('Target.closeTarget', { targetId: 'owned' })
  })

  it('also closes an owned target that never attaches', async () => {
    vi.useFakeTimers()
    const fixture = backgroundBrowser({ attached: false })
    const rejected = expect(createBackgroundPage(fixture.browser, 'about:blank')).rejects.toThrow('not attached')

    await vi.runAllTimersAsync()
    await rejected

    expect([...fixture.targets]).toEqual(['existing'])
  })

  it('preserves the navigation error when target or session cleanup fails', async () => {
    const navigationError = new Error('navigation failed')
    const fixture = backgroundBrowser({ navigationError, cleanupError: new Error('cleanup failed') })

    await expect(createBackgroundPage(fixture.browser, 'https://example.invalid/')).rejects.toBe(navigationError)

    expect(fixture.cdp.send).toHaveBeenCalledWith('Target.closeTarget', { targetId: 'owned' })
    expect(fixture.targets.has('existing')).toBe(true)
  })

  it('transfers the successfully navigated target to the caller without closing it', async () => {
    const fixture = backgroundBrowser()

    await expect(createBackgroundPage(fixture.browser, 'about:blank')).resolves.toBe(fixture.owned)

    expect([...fixture.targets]).toEqual(['existing', 'owned'])
    expect(fixture.cdp.send).not.toHaveBeenCalledWith('Target.closeTarget', expect.anything())
  })
})

describe('verification profile boundary', () => {
  it('rejects normal Chrome profiles and their profile subdirectories', async () => {
    const root = path.join(os.homedir(), 'Library/Application Support/Google/Chrome')
    await expect(assertVerificationProfile(root)).rejects.toThrow('dedicated development profile')
    await expect(assertVerificationProfile(path.join(root, 'Profile 3'))).rejects.toThrow('dedicated development profile')
    await expect(assertVerificationProfile()).rejects.toThrow('Pass --profile')
  })

  it('requires the exact listening port and selected profile, including paths with spaces', async () => {
    const profileDir = '/private/tmp/YLC Verify Test'
    const command = `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --user-data-dir=${profileDir} --remote-debugging-port=9336 --mute-audio`
    const inspectProcess = async () => ({ pid: '42', command })
    await expect(verifyCdpProfile({ port: 9336, profileDir, inspectProcess })).resolves.toMatchObject({ pid: '42' })
    await expect(verifyCdpProfile({ port: 933, profileDir, inspectProcess })).rejects.toThrow('does not match')
    await expect(verifyCdpProfile({ port: 9336, profileDir: `${profileDir} other`, inspectProcess })).rejects.toThrow('does not match')
    await expect(verifyCdpProfile({ port: Number.NaN, profileDir, inspectProcess })).rejects.toThrow('CDP port')
  })

  it('canonicalizes aliases before matching the explicitly chosen profile', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ylc-profile-boundary-'))
    temporary.push(directory)
    const alias = `${directory}-alias`
    temporary.push(alias)
    await symlink(directory, alias)
    const command = `chrome --user-data-dir="${alias}" --remote-debugging-port=9336 --mute-audio`
    await expect(
      verifyCdpProfile({ port: 9336, profileDir: directory, inspectProcess: async () => ({ pid: '42', command }) }),
    ).resolves.toMatchObject({ pid: '42' })
  })

  it('does not accept a similarly named command argument', () => {
    expect(commandArgument('chrome --other-user-data-dir=/tmp/profile --remote-debugging-port=9336', '--user-data-dir')).toBeNull()
    expect(commandArgument('chrome --user-data-dir="/tmp/path with spaces" --mute-audio', '--user-data-dir')).toBe('/tmp/path with spaces')
  })
})
