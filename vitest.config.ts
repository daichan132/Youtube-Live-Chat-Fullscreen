import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const unoCssPath = fileURLToPath(new URL('./vitest.empty.css', import.meta.url))

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
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
    ],
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
