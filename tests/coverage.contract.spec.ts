import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { coverageConfig, coverageExclude, coverageInclude, coverageThresholds } from '../vitest.coverage'

describe('coverage policy', () => {
  it('measures production source while excluding generated, asset, type-only, and test-seam files', () => {
    expect(coverageInclude).toEqual(['entrypoints/**/*.{ts,tsx}', 'shared/**/*.{ts,tsx}'])
    expect(coverageExclude).toEqual(
      expect.arrayContaining([
        '**/*.spec.{ts,tsx}',
        '**/*.d.ts',
        '**/assets/**',
        '**/generated/**',
        '**/icons/**',
        '**/types.ts',
        'shared/state/testUtils.ts',
      ]),
    )
    expect(coverageConfig.reportsDirectory).toBe('.wxt/coverage')
  })

  it('ratchets the aggregate baseline and critical module coverage', () => {
    expect(coverageThresholds).toMatchObject({
      statements: 81.57,
      branches: 72.93,
      functions: 82.45,
      lines: 85.41,
      'entrypoints/content/runtime/resolveChatDecision.ts': expect.objectContaining({ functions: 100 }),
      'entrypoints/content/runtime/runtimeModel.ts': expect.objectContaining({ lines: 100, functions: 100 }),
      'shared/i18n/language.ts': expect.objectContaining({ functions: 100 }),
      'shared/settings/fitGeometryToViewport.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      'shared/settings/migrateSettings.ts': expect.objectContaining({ lines: 92.15 }),
      'shared/settings/normalizeSettings.ts': expect.objectContaining({ functions: 100 }),
    })
    expect(coverageConfig.thresholds).toBe(coverageThresholds)
  })

  it('collects core and DOM coverage once before running non-instrumented contracts', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      scripts: Record<string, string>
    }
    const coverageScript = packageJson.scripts['test:coverage']

    expect(coverageScript).toBe(
      'vitest run --coverage --project core --project dom && vitest run --project contracts tests/coverage.contract.spec.ts',
    )
    expect(coverageScript.match(/--coverage/g)).toHaveLength(1)
  })
})
