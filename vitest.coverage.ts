import type { CoverageV8Options } from 'vitest/node'

export const coverageInclude = ['entrypoints/**/*.{ts,tsx}', 'shared/**/*.{ts,tsx}']

export const coverageExclude = [
  '**/*.spec.{ts,tsx}',
  '**/*.d.ts',
  '**/assets/**',
  '**/generated/**',
  '**/icons/**',
  '**/types.ts',
  'shared/state/testUtils.ts',
]

export const coverageConfig = {
  provider: 'v8',
  include: coverageInclude,
  exclude: coverageExclude,
  reporter: ['text', 'json-summary'],
  reportsDirectory: '.wxt/coverage',
  reportOnFailure: true,
  thresholds: {
    statements: 80,
    branches: 70,
    functions: 80,
    lines: 85,
  },
} satisfies CoverageV8Options
