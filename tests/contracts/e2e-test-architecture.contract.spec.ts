import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { CANARY_SPECS, FIXTURE_SPECS } from '../../e2e/config/projectClassification'
import { blockExternalNetwork } from '../../e2e/fixtures/deterministic'
import wxtConfig from '../../wxt.config'

const scenariosDir = resolve(import.meta.dirname, '../../e2e/scenarios')

const collectScenarioSpecs = async (directory: string, relativeDirectory = ''): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const specs = await Promise.all(
    entries.map(async entry => {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name
      if (entry.isDirectory()) return collectScenarioSpecs(resolve(directory, entry.name), relativePath)
      return entry.isFile() && entry.name.endsWith('.spec.ts') ? [relativePath] : []
    }),
  )
  return specs.flat().sort()
}

describe('E2E test architecture', () => {
  it('classifies every scenario exactly once', async () => {
    const fixture = [...FIXTURE_SPECS]
    const canary = [...CANARY_SPECS]
    const classified = [...fixture, ...canary]

    expect(new Set(classified).size).toBe(classified.length)
    expect(classified.sort()).toEqual(await collectScenarioSpecs(scenariosDir))
  })

  it('includes the extension storage bridge only in testing builds', async () => {
    type PublicAsset = { absoluteSrc: string; relativeDest: string }
    type PublicAssetsHook = (wxt: { config: { mode: string } }, files: PublicAsset[]) => void | Promise<void>

    const hooks = wxtConfig.hooks as Record<string, unknown> | undefined
    const hook = hooks?.['build:publicAssets'] as PublicAssetsHook
    const productionFiles: PublicAsset[] = []
    const testingFiles: PublicAsset[] = []

    await hook({ config: { mode: 'production' } }, productionFiles)
    await hook({ config: { mode: 'testing' } }, testingFiles)

    expect(productionFiles.map(file => file.relativeDest)).not.toContain('e2e.html')
    expect(testingFiles.map(file => file.relativeDest)).toEqual(['e2e.html'])
  })

  it('blocks HTTP traffic in deterministic browser contexts', async () => {
    type RouteHandler = (route: { abort: (errorCode: string) => Promise<void> }) => Promise<void>
    const registration: { matcher?: RegExp; handler?: RouteHandler } = {}
    const context = {
      route: vi.fn((matcher: RegExp, handler: RouteHandler) => {
        registration.matcher = matcher
        registration.handler = handler
      }),
    }

    await blockExternalNetwork(context as never)

    expect(registration.matcher).toBeInstanceOf(RegExp)
    expect(registration.matcher?.test('https://www.youtube.com/watch?v=fixture')).toBe(true)
    expect(registration.matcher?.test('chrome-extension://fixture-id/e2e.html')).toBe(false)

    const abort = vi.fn(async () => {})
    await registration.handler?.({ abort })
    expect(abort).toHaveBeenCalledWith('blockedbyclient')
  })
})
