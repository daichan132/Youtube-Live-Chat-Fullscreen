import { defineConfig } from '@playwright/test'

export default defineConfig({
	globalSetup: './e2e/global-setup',
	testDir: 'e2e',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// Persistent fullscreen/live contexts are most stable when run serially, especially on macOS.
	// Use Playwright's explicit --workers CLI option when parallel speed is worth the reduced isolation.
	workers: 1,
	reporter: 'html',
	projects: [
		{
			name: 'e2e',
			testIgnore: ['screenshots/**', 'config/**', 'support/**/*.spec.ts'],
			use: {
				locale: 'en-US',
				timezoneId: 'Asia/Tokyo',
				contextOptions: { reducedMotion: 'no-preference' },
				trace: 'retain-on-failure',
				video: 'retain-on-failure',
				screenshot: 'only-on-failure',
			},
		},
		{
			name: 'screenshots',
			testMatch: /screenshots\/.*\.spec\.ts/,
			timeout: 300000,
			use: {
				viewport: { width: 1280, height: 720 },
				deviceScaleFactor: 2,
				trace: 'off',
			},
		},
	],
})
