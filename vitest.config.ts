import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    clearMocks: true,
    environment: 'jsdom',
    include: [
      'shared/**/*.spec.ts',
      'shared/**/*.spec.tsx',
      'entrypoints/**/*.spec.ts',
      'entrypoints/**/*.spec.tsx',
    ],
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
