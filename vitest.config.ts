import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const unoCssPath = fileURLToPath(new URL('./vitest.empty.css', import.meta.url))

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'uno.css': unoCssPath,
    },
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
      'scripts/verify/**/*.spec.mjs',
    ],
    exclude: ['node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
