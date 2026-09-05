import { defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'
import { coverageConfig } from './vitest.coverage.ts'

const sourceSpecs = ['shared/**/*.spec.ts', 'shared/**/*.spec.tsx', 'entrypoints/**/*.spec.ts', 'entrypoints/**/*.spec.tsx']

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    clearMocks: true,
    restoreMocks: true,
    allowOnly: process.env.YLC_ALLOW_ONLY === '1',
    coverage: coverageConfig,
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          include: ['**/*.unit.spec.ts', '**/*.unit.spec.tsx'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          environmentOptions: {
            jsdom: {
              url: 'https://www.youtube.com/',
            },
          },
          include: ['**/*.dom.spec.ts', '**/*.dom.spec.tsx', ...sourceSpecs, 'e2e/support/diagnostics.spec.ts'],
          exclude: [
            'node_modules/**',
            '**/*.unit.spec.ts',
            '**/*.unit.spec.tsx',
            '**/*.contract.spec.ts',
            '**/*.contract.spec.tsx',
          ],
          setupFiles: ['./tests/setup/dom.ts', './tests/setup/extension.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'contracts',
          environment: 'node',
          include: [
            '**/*.contract.spec.ts',
            '**/*.contract.spec.tsx',
            'e2e/config/**/*.spec.ts',
            'e2e/support/**/*.spec.ts',
            'scripts/verify/**/*.spec.mjs',
          ],
          exclude: [
            'node_modules/**',
            '**/*.unit.spec.ts',
            '**/*.unit.spec.tsx',
            '**/*.dom.spec.ts',
            '**/*.dom.spec.tsx',
            'e2e/support/diagnostics.spec.ts',
          ],
        },
      },
    ],
    exclude: ['node_modules/**'],
  },
})
