import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  extractNpmLocators,
  fetchPublishTimes,
  findNewNpmLocators,
  readMinimalAgeMinutes,
  verifyLocatorAges,
} from './check-lockfile-age.mjs'

const fixture = name => fs.readFileSync(path.resolve('scripts/verify/fixtures', name), 'utf8')

describe('dependency release age gate', () => {
  it('extracts only new npm package versions from the lockfile fixture', () => {
    expect(findNewNpmLocators(fixture('age-gate-base.lock'), fixture('age-gate-current.lock'))).toEqual([
      { name: '@scope/new-package', version: '3.0.1' },
      { name: 'existing', version: '1.1.0' },
    ])
  })

  it('deduplicates the same npm locator and excludes non-npm resolutions', () => {
    const locators = extractNpmLocators(fixture('age-gate-current.lock'))
    expect([...locators.values()]).toEqual([
      { name: 'existing', version: '1.1.0' },
      { name: 'same-version', version: '2.0.0' },
      { name: '@scope/new-package', version: '3.0.1' },
    ])
  })

  it('reads the configured minimal age as minutes', () => {
    expect(readMinimalAgeMinutes('nodeLinker: node-modules\nnpmMinimalAgeGate: 4320m\n')).toBe(4320)
    expect(readMinimalAgeMinutes('npmMinimalAgeGate: 72h\n')).toBe(4320)
    expect(() => readMinimalAgeMinutes('nodeLinker: node-modules\n')).toThrow('Missing npmMinimalAgeGate')
  })

  it('passes versions at or beyond the configured age boundary', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ time: { '1.2.3': '2026-07-20T00:00:00.000Z' } }),
    }))

    await expect(
      verifyLocatorAges({
        locators: [{ name: 'example-package', version: '1.2.3' }],
        minimalAgeMinutes: 4320,
        now: new Date('2026-07-23T00:00:00.000Z'),
        fetchImpl,
      }),
    ).resolves.toBeUndefined()
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://registry.npmjs.org/example-package',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('queries each public package once when multiple new versions share its packument', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        time: {
          '1.0.0': '2026-07-01T00:00:00.000Z',
          '2.0.0': '2026-07-02T00:00:00.000Z',
        },
      }),
    }))

    await verifyLocatorAges({
      locators: [
        { name: 'shared-package', version: '1.0.0' },
        { name: 'shared-package', version: '2.0.0' },
      ],
      minimalAgeMinutes: 4320,
      now: new Date('2026-07-23T00:00:00.000Z'),
      fetchImpl,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('fails with package, version, publish time, and required age for a quarantined version', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ time: { '1.2.3': '2026-07-22T00:00:00.000Z' } }),
    })

    await expect(
      verifyLocatorAges({
        locators: [{ name: '@scope/example', version: '1.2.3' }],
        minimalAgeMinutes: 4320,
        now: new Date('2026-07-23T00:00:00.000Z'),
        fetchImpl,
      }),
    ).rejects.toThrow(
      '@scope/example@1.2.3: published 2026-07-22T00:00:00.000Z (24.0 hours old; minimum is 72.0 hours)',
    )
  })

  it('fails closed when publish time metadata is missing', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ time: {} }) })

    await expect(
      verifyLocatorAges({
        locators: [{ name: 'missing-time', version: '1.0.0' }],
        minimalAgeMinutes: 4320,
        fetchImpl,
      }),
    ).rejects.toThrow('missing-time@1.0.0: registry metadata has no valid publish time')
  })

  it('fails closed when the registry request fails', async () => {
    const fetchImpl = async () => {
      throw new Error('network unavailable')
    }

    await expect(fetchPublishTimes({ packageName: 'network-failure', fetchImpl })).rejects.toThrow(
      'Could not query publish times for network-failure: network unavailable',
    )
  })
})
