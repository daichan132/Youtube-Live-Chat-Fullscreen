import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 300000,
  workers: 1,
  reporter: 'list',
  use: {
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    trace: 'off',
  },
})
