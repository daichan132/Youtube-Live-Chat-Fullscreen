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
		ignoreDefaultArgs: ['--disable-extensions'],
		args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`, '--mute-audio'],
	})
	await ctx.addInitScript(PAGE_HELPERS_INIT_SCRIPT)
	return ctx
}

const isExtensionWorker = (w: Worker) => w.url().startsWith('chrome-extension://')

const waitForMv3Worker = async (context: BrowserContext) => {
	const findWorker = () => context.serviceWorkers().find(isExtensionWorker) ?? null

	let worker = findWorker()
	if (worker) return worker

	// Set up event listener BEFORE warmup to avoid missing the SW start during navigation.
	// waitForEvent only captures NEW events — setting it up first reduces the race window.
	const swPromise = context
		.waitForEvent('serviceworker', { predicate: isExtensionWorker, timeout: EXTENSION_BOOT_TIMEOUT_MS })
		.catch(() => null)

	// Warmup: navigate to a URL matching content_scripts.matches to trigger SW startup
	const warmup = await context.newPage()
	await warmup.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null)

	worker = findWorker() ?? (await swPromise)
	await warmup.close()

	if (worker) return worker

	// CDP restart fallback (Playwright #39075): stop all SWs and re-trigger
	try {
		const cdp = await context.newCDPSession(context.pages()[0] ?? (await context.newPage()))
		await cdp.send('ServiceWorker.enable')
		await cdp.send('ServiceWorker.stopAllWorkers')
		await cdp.detach()

		// Set up listener before re-warmup (same pattern)
		const retryPromise = context
			.waitForEvent('serviceworker', { predicate: isExtensionWorker, timeout: 10_000 })
			.catch(() => null)

		const rewarmup = await context.newPage()
		await rewarmup.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => null)

		worker = findWorker() ?? (await retryPromise)
		await rewarmup.close().catch(() => null)
	} catch {
		// CDP fallback is best-effort — ignore failures
	}

	return worker
}

/** Re-acquire the active extension Service Worker. Use this when the SW may have been terminated by Chrome's idle timeout. */
const getActiveWorker = async (context: BrowserContext): Promise<Worker | null> => {
	const worker = context.serviceWorkers().find(isExtensionWorker) ?? null
	if (worker) return worker
	return context.waitForEvent('serviceworker', { predicate: isExtensionWorker, timeout: 10_000 }).catch(() => null)
}

const resolveExtensionIdFromChromePage = async (context: BrowserContext) => {
	const page = await context.newPage()
	try {
		await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded', timeout: 20000 })
		// Collect all extension items and pick the first one with an ID.
		// --disable-extensions-except should ensure only our extension is listed,
		// but iterating all items is more defensive than querySelector for the first.
		const extensionId = await page.evaluate(() => {
			const manager = document.querySelector('extensions-manager')
			const itemList = manager?.shadowRoot?.querySelector('extensions-item-list')
			const items = Array.from(itemList?.shadowRoot?.querySelectorAll('extensions-item') ?? [])
			for (const item of items) {
				const id = item.getAttribute('id')
				if (id) return id
			}
			return null
		})
		return extensionId
	} catch {
		return null
	} finally {
		await page.close().catch(() => null)
	}
}

/**
 * Storage accessor via chrome.storage.local API.
 *
 * Runtime fallback: tries Worker first, falls back to e2e.html bridge on failure.
 * e2e.html has no React/Zustand, so the fallback is free of rehydration side-effects.
 * Once the Worker fails, all subsequent calls go through the Page path permanently.
 *
 * The original design (boot-time bifurcation) chose the path once at startup and
 * never fell back at runtime. This was necessary when popup.html was the Page path
 * — opening it triggered Zustand persist rehydration that overwrote test data.
 * With e2e.html (no framework), runtime fallback is safe and more resilient:
 * if the Worker dies mid-test (e.g. Target closed), recovery is automatic.
 */
const createStorageAccessor = (context: BrowserContext, extensionId: string, initialWorker: Worker | null): Extension['storage'] => {
	let worker = initialWorker
	const bridgeUrl = `chrome-extension://${extensionId}/e2e.html`

	const viaE2EPage = async <T>(fn: (page: Page) => Promise<T>): Promise<T> => {
		const page = await context.newPage()
		try {
			await page.goto(bridgeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
			return await fn(page)
		} finally {
			await page.close().catch(() => null)
		}
	}

	const withFallback = async <T>(workerFn: (w: Worker) => Promise<T>, pageFn: () => Promise<T>): Promise<T> => {
		if (worker) {
			try {
				return await workerFn(worker)
			} catch {
				worker = null
			}
		}
		return pageFn()
	}

	return {
		get: (keys?: string | string[] | null) =>
			withFallback(
				(w) => w.evaluate((k) => chrome.storage.local.get(k), keys ?? null),
				() => viaE2EPage((p) => p.evaluate((k) => chrome.storage.local.get(k), keys ?? null)),
			),
		set: (items: Record<string, unknown>) =>
			withFallback(
				(w) =>
					w
						.evaluate((i) => chrome.storage.local.set(i), items)
						.then(() => {}),
				() =>
					viaE2EPage((p) =>
						p
							.evaluate((i) => chrome.storage.local.set(i), items)
							.then(() => {}),
					),
			),
		clear: () =>
			withFallback(
				(w) =>
					w.evaluate(() => chrome.storage.local.clear()).then(() => {}),
				() => viaE2EPage((p) => p.evaluate(() => chrome.storage.local.clear()).then(() => {})),
			),
	}
}

/** Register addLocatorHandler for YouTube consent dialogs — complements acceptYouTubeConsent(). */
const registerConsentHandler = async (page: Page) => {
	await page.addLocatorHandler(page.locator('button:has-text("Accept all"), button:has-text("I agree"), button:has-text("同意する")'), async (btn) => {
		await btn.first().click()
	}, { noWaitAfter: true })
}

const resolveExtension = async (context: BrowserContext): Promise<Extension> => {
	const worker = await waitForMv3Worker(context)

	const extensionIdFromWorker = worker ? new URL(worker.url()).host : null
	const extensionId = extensionIdFromWorker ?? (await resolveExtensionIdFromChromePage(context))
	if (!extensionId) {
		throw new Error('Could not resolve extension ID from service worker or chrome://extensions.')
	}

	const storage = createStorageAccessor(context, extensionId, worker)

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
			await registerConsentHandler(page)
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
			await registerConsentHandler(tempPage)
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
			await registerConsentHandler(tempPage)
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
