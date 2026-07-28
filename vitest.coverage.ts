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

export const coverageThresholds = {
  statements: 81.57,
  branches: 72.93,
  functions: 82.45,
  lines: 85.41,
  'entrypoints/content/features/Draggable/hooks/clipGeometry.ts': {
    statements: 97.29,
    branches: 96.42,
    functions: 100,
    lines: 97.05,
  },
  'entrypoints/content/runtime/resolveChatDecision.ts': {
    statements: 85.71,
    branches: 84.61,
    functions: 100,
    lines: 91.66,
  },
  'entrypoints/content/runtime/runtimeModel.ts': {
    statements: 94.91,
    branches: 81.81,
    functions: 100,
    lines: 100,
  },
  'shared/i18n/language.ts': {
    statements: 95.65,
    branches: 91.66,
    functions: 100,
    lines: 95,
  },
  'shared/settings/fitGeometryToViewport.ts': {
    statements: 100,
    branches: 100,
    functions: 100,
    lines: 100,
  },
  'shared/settings/migrateSettings.ts': {
    statements: 88.52,
    branches: 85.93,
    functions: 85.71,
    lines: 92.15,
  },
  'shared/settings/normalizeSettings.ts': {
    statements: 93.02,
    branches: 84.26,
    functions: 100,
    lines: 98.59,
  },
} satisfies NonNullable<CoverageV8Options['thresholds']>

export const coverageConfig = {
  provider: 'v8',
  include: coverageInclude,
  exclude: coverageExclude,
  reporter: ['text', 'json-summary'],
  reportsDirectory: '.wxt/coverage',
  reportOnFailure: true,
  thresholds: coverageThresholds,
} satisfies CoverageV8Options
