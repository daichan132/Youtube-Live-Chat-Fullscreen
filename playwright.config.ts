import { defineConfig } from '@playwright/test'
import {
  ACCESSIBILITY_PROJECT_NAME,
  CANARY_PROJECT_NAME,
  CANARY_SPECS,
  FIXTURE_PROJECT_NAME,
  FIXTURE_SPECS,
  PRODUCTION_CHROME_PROJECT_NAME,
  STORE_ASSETS_PROJECT_NAME,
  toPlaywrightTestMatch,
  VISUAL_PROJECT_NAME,
} from './e2e/config/projectClassification'

const extensionUse = {
  locale: 'en-US',
  timezoneId: 'Asia/Tokyo',
  contextOptions: { reducedMotion: 'no-preference' as const },
  trace: 'retain-on-failure' as const,
  video: 'retain-on-failure' as const,
  screenshot: 'only-on-failure' as const,
}

const deterministicUse = {
  locale: 'en-US',
  timezoneId: 'Asia/Tokyo',
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  colorScheme: 'light' as const,
  reducedMotion: 'reduce' as const,
  trace: 'retain-on-failure' as const,
  video: 'off' as const,
  screenshot: 'only-on-failure' as const,
}

export default defineConfig({
  globalSetup: './e2e/global-setup',
  forbidOnly: !!process.env.CI,
  // Persistent fullscreen/live contexts are most stable when run serially, especially on macOS.
  // Use Playwright's explicit --workers CLI option when parallel speed is worth the reduced isolation.
  workers: 1,
  reporter: [['html'], ['./e2e/reporters/canarySummary.ts']],
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
      name: VISUAL_PROJECT_NAME,
      testDir: 'e2e/visual',
      testMatch: '**/*.visual.spec.ts',
      retries: 0,
      snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}',
      expect: {
        toHaveScreenshot: {
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.002,
          threshold: 0.2,
        },
      },
      use: deterministicUse,
    },
    {
      name: ACCESSIBILITY_PROJECT_NAME,
      testDir: 'e2e/accessibility',
      testMatch: '**/*.accessibility.spec.ts',
      retries: 0,
      use: deterministicUse,
    },
    {
      name: PRODUCTION_CHROME_PROJECT_NAME,
      testDir: 'e2e/production',
      testMatch: '**/*.production.spec.ts',
      retries: 0,
      use: extensionUse,
    },
    {
      name: STORE_ASSETS_PROJECT_NAME,
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
