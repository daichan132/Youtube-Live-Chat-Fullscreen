import { describe, expect, it } from 'vitest'
import wxtConfig from '../../wxt.config'

describe('E2E test architecture', () => {
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
})
