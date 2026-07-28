import { defineConfig } from '@playwright/test'
import {
  CANARY_PROJECT_NAME,
  CANARY_SPECS,
  FIXTURE_PROJECT_NAME,
  FIXTURE_SPECS,
  toPlaywrightTestMatch,
} from './e2e/config/projectClassification'

const extensionUse = {
  locale: 'en-US',
  timezoneId: 'Asia/Tokyo',
  contextOptions: { reducedMotion: 'no-preference' as const },
  trace: 'retain-on-failure' as const,
  video: 'retain-on-failure' as const,
  screenshot: 'only-on-failure' as const,
}

export default defineConfig({
  globalSetup: './e2e/global-setup',
  forbidOnly: !!process.env.CI,
  // Persistent fullscreen/live contexts are most stable when run serially, especially on macOS.
  // Use Playwright's explicit --workers CLI option when parallel speed is worth the reduced isolation.
  workers: 1,
  reporter: 'html',
  projects: [
    {
      name: FIXTURE_PROJECT_NAME,
      testDir: 'e2e/scenarios',
      testMatch: toPlaywrightTestMatch(FIXTURE_SPECS),
      retries: 0,
      use: extensionUse,
    },
    {
      name: CANARY_PROJECT_NAME,
      testDir: 'e2e/scenarios',
      testMatch: toPlaywrightTestMatch(CANARY_SPECS),
      retries: process.env.CI ? 2 : 0,
      use: extensionUse,
    },
    {
      name: 'screenshots',
      testDir: 'e2e/screenshots',
      testMatch: '**/*.spec.ts',
      timeout: 300000,
      use: {
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 2,
        trace: 'off',
      },
    },
  ],
})
