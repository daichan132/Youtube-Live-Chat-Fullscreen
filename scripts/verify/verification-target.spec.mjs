import { mkdtemp, rm, symlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { assertVerificationProfile, commandArgument, verifyCdpProfile } from './verification-target.mjs'

const temporary = []
afterEach(async () => {
  await Promise.all(temporary.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
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
