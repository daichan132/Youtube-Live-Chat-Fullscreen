import { defineConfig } from '@playwright/test'

export default defineConfig({
	globalSetup: './e2e/global-setup',
	testDir: 'e2e',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	projects: [
		{
			name: 'e2e',
			testIgnore: ['screenshots/**', 'config/**'],
			use: {
				trace: 'on-first-retry',
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
