import { defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'

export default defineConfig({
  plugins: [WxtVitest()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    clearMocks: true,
    environment: 'jsdom',
    include: [
      'shared/**/*.spec.ts',
      'shared/**/*.spec.tsx',
      'entrypoints/**/*.spec.ts',
      'entrypoints/**/*.spec.tsx',
      'e2e/config/**/*.spec.ts',
      'e2e/support/**/*.spec.ts',
      'scripts/verify/**/*.spec.mjs',
    ],
    exclude: ['node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
