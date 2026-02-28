import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { type BrowserContext, test as base, chromium, type Page, type Worker } from '@playwright/test'
import { PAGE_HELPERS_INIT_SCRIPT } from '@e2e/support/pageHelpers'
import { selectArchiveReplayUrl } from '@e2e/support/urls/archiveReplay'
import { findLiveUrlWithChat } from '@e2e/utils/liveUrl'

const pathToExtension = path.resolve('.output/chrome-mv3')
const EXTENSION_BOOT_TIMEOUT_MS = 45000

export type Extension = {
	id: string
	worker: Worker | null
	url: (path: string) => string
	storage: {
		get(keys?: string | string[] | null): Promise<Record<string, unknown>>
		set(items: Record<string, unknown>): Promise<void>
		clear(): Promise<void>
	}
}

const launchExtensionContext = async (userDataDir: string) => {
	const ctx = await chromium.launchPersistentContext(userDataDir, {
		headless: false,
		args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`, '--mute-audio'],
	})
	await ctx.addInitScript(PAGE_HELPERS_INIT_SCRIPT)
	return ctx
}

const waitForMv3Worker = async (context: BrowserContext) => {
	const deadline = Date.now() + EXTENSION_BOOT_TIMEOUT_MS
	const findWorker = () => context.serviceWorkers().find(worker => worker.url().startsWith('chrome-extension://')) ?? null

	let worker = findWorker()
	if (worker) return worker

	const warmup = await context.newPage()
	await warmup.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null)
	while (!worker && Date.now() < deadline) {
		worker = findWorker()
		if (worker) break
		const timeout = Math.min(3000, Math.max(1, deadline - Date.now()))
		await context.waitForEvent('serviceworker', { timeout }).catch(() => null)
	}
	await warmup.close()

	return worker
}

const resolveExtensionIdFromChromePage = async (context: BrowserContext) => {
	const page = await context.newPage()
	try {
		await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded', timeout: 20000 })
		const extensionId = await page.evaluate(() => {
			const manager = document.querySelector('extensions-manager')
			const managerRoot = manager?.shadowRoot
			const itemList = managerRoot?.querySelector('extensions-item-list')
			const itemListRoot = itemList?.shadowRoot
			const firstItem = itemListRoot?.querySelector('extensions-item')
			return firstItem?.getAttribute('id') ?? null
		})
		return extensionId
	} catch {
		return null
	} finally {
		await page.close().catch(() => null)
	}
}

const createWorkerStorageAccessor = (worker: Worker): Extension['storage'] => ({
	get: async (keys?: string | string[] | null) => {
		return worker.evaluate(async k => {
			if (k === undefined || k === null) return chrome.storage.local.get(null)
			return chrome.storage.local.get(k)
		}, keys ?? null)
	},
	set: async (items: Record<string, unknown>) => {
		await worker.evaluate(async i => {
			await chrome.storage.local.set(i)
		}, items)
	},
	clear: async () => {
		await worker.evaluate(async () => {
			await chrome.storage.local.clear()
		})
	},
})

const createPageStorageAccessor = (context: BrowserContext, extensionId: string): Extension['storage'] => {
	const popupUrl = `chrome-extension://${extensionId}/popup.html`

	const withPopupPage = async <T>(fn: (page: Page) => Promise<T>): Promise<T> => {
		const page = await context.newPage()
		try {
			await page.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
			const result = await fn(page)
			await page.goto('about:blank')
			return result
		} finally {
			await page.close().catch(() => null)
		}
	}

	return {
		get: async (keys?: string | string[] | null) => {
			return withPopupPage(async page => {
				return (await page.evaluate(async k => {
					if (k === undefined || k === null) return chrome.storage.local.get(null)
					return chrome.storage.local.get(k)
				}, keys ?? null)) as Record<string, unknown>
			})
		},
		set: async (items: Record<string, unknown>) => {
			await withPopupPage(async page => {
				await page.evaluate(async i => {
					await chrome.storage.local.set(i)
				}, items)
			})
		},
		clear: async () => {
			await withPopupPage(async page => {
				await page.evaluate(async () => {
					await chrome.storage.local.clear()
				})
			})
		},
	}
}

const resolveExtension = async (context: BrowserContext): Promise<Extension> => {
	const worker = await waitForMv3Worker(context)

	const extensionIdFromWorker = worker ? worker.url().split('/')[2] : null
	const extensionId = extensionIdFromWorker ?? (await resolveExtensionIdFromChromePage(context))
	if (!extensionId) {
		throw new Error('Could not resolve extension ID from service worker or chrome://extensions.')
	}

	const storage = worker ? createWorkerStorageAccessor(worker) : createPageStorageAccessor(context, extensionId)

	return {
		id: extensionId,
		worker,
		url: (p: string) => `chrome-extension://${extensionId}/${p}`,
		storage,
	}
}

export const test = base.extend<
	{
		context: BrowserContext
		extensionId: string
		extension: Extension
	},
	{
		urlLookupContext: BrowserContext
		sharedContext: BrowserContext
		sharedExtension: Extension
		sharedPage: Page
		liveUrl: string | null
		archiveReplayUrl: string | null
	}
>({
	// ── Worker-scoped ──

	// Separate browser for URL lookups (keeps the test context clean).
	urlLookupContext: [
		// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture requires destructuring
		async ({}, use) => {
			const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-url-lookup-'))
			const ctx = await launchExtensionContext(userDataDir)
			await waitForMv3Worker(ctx)
			await use(ctx)
			await ctx.close()
			fs.rmSync(userDataDir, { recursive: true, force: true })
		},
		{ scope: 'worker', timeout: 120000 },
	],

	// Single browser context shared across all tests in a worker.
	sharedContext: [
		// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture requires destructuring
		async ({}, use) => {
			const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-ext-'))
			const ctx = await launchExtensionContext(userDataDir)
			await use(ctx)
			await ctx.close()
			fs.rmSync(userDataDir, { recursive: true, force: true })
		},
		{ scope: 'worker', timeout: 120000 },
	],

	// Extension booted once per worker in the shared test context.
	sharedExtension: [
		async ({ sharedContext }, use) => {
			await use(await resolveExtension(sharedContext))
		},
		{ scope: 'worker', timeout: 120000 },
	],

	// Persistent page reused across tests (never closed — Chrome fullscreen bug workaround).
	sharedPage: [
		async ({ sharedContext }, use) => {
			const page = await sharedContext.newPage()
			// Close any leftover pages (e.g., Chrome's initial about:blank tab) so sharedPage is the active tab.
			for (const p of sharedContext.pages()) {
				if (p !== page) await p.close().catch(() => null)
			}
			await use(page)
			// Do NOT close — closing a fullscreen-capable page breaks fullscreen for the context.
		},
		{ scope: 'worker', timeout: 120000 },
	],

	// URL lookup uses a separate context to keep the test context clean.
	liveUrl: [
		async ({ urlLookupContext }, use) => {
			const tempPage = await urlLookupContext.newPage()
			try {
				const url = await findLiveUrlWithChat(tempPage)
				await use(url)
			} finally {
				await tempPage.close()
			}
		},
		{ scope: 'worker', timeout: 120000 },
	],

	archiveReplayUrl: [
		async ({ urlLookupContext }, use) => {
			const tempPage = await urlLookupContext.newPage()
			try {
				const url = await selectArchiveReplayUrl(tempPage)
				await use(url)
			} finally {
				await tempPage.close()
			}
		},
		{ scope: 'worker', timeout: 120000 },
	],

	// ── Test-scoped overrides ──

	// Expose the shared context as `context` so tests calling context.newPage() still work.
	context: async ({ sharedContext }, use) => {
		await use(sharedContext)
	},

	extension: [
		async ({ sharedExtension }, use) => {
			await use(sharedExtension)
		},
		{ timeout: 60000 },
	],

	extensionId: async ({ extension }, use) => {
		await use(extension.id)
	},

	// Reuse the shared page with per-test cleanup.
	page: async ({ sharedPage, sharedExtension }, use) => {
		// Clean up residual state from the previous test
		await sharedExtension.storage.clear()
		await sharedPage
			.evaluate(() => {
				if (document.fullscreenElement) return document.exitFullscreen()
			})
			.catch(() => null)
		await sharedPage
			.goto('about:blank', {
				waitUntil: 'domcontentloaded',
				timeout: 10000,
			})
			.catch(() => null)
		// Ensure the page is the active tab (required for fullscreen API)
		await sharedPage.bringToFront()
		await use(sharedPage)
	},
})
export const expect = test.expect
