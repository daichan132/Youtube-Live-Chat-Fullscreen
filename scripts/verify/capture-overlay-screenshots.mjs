#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const DEFAULT_PORT = 9335
const DEFAULT_OUT_DIR = path.join('/private/tmp', `ylc-overlay-screenshots-${Date.now()}`)
const DEFAULT_TIMEOUT = 30000

const args = new Map()
for (let index = 2; index < process.argv.length; index += 1) {
	const arg = process.argv[index]
	if (!arg.startsWith('--')) continue

	const [rawKey, inlineValue] = arg.slice(2).split('=', 2)
	const value = inlineValue ?? process.argv[index + 1]
	args.set(rawKey, value)
	if (inlineValue === undefined) index += 1
}

const port = Number(args.get('port') ?? process.env.YLC_VERIFY_PORT ?? DEFAULT_PORT)
const targetUrlPart = args.get('url-includes') ?? 'youtube.com/watch'
const outDir = path.resolve(args.get('out') ?? process.env.YLC_VERIFY_SCREENSHOT_DIR ?? DEFAULT_OUT_DIR)
const timeout = Number(args.get('timeout') ?? DEFAULT_TIMEOUT)

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)

const deepOverlayState = () => {
	const findDeep = predicate => {
		let found = null

		const walk = root => {
			for (const element of root.querySelectorAll('*')) {
				if (predicate(element)) {
					found = element
					return
				}
				if (element.shadowRoot) {
					walk(element.shadowRoot)
					if (found) return
				}
			}
		}

		walk(document)
		return found
	}

	const rectOf = element => {
		if (!element) return null
		const rect = element.getBoundingClientRect()
		const style = window.getComputedStyle(element)
		return {
			tag: element.tagName.toLowerCase(),
			x: Math.round(rect.x),
			y: Math.round(rect.y),
			width: Math.round(rect.width),
			height: Math.round(rect.height),
			opacity: style.opacity,
			pointerEvents: style.pointerEvents,
			display: style.display,
			background: style.backgroundColor,
			transform: style.transform,
		}
	}

	const controlRail = findDeep(element => element.hasAttribute('data-ylc-control-rail'))
	const frame = findDeep(element => element.hasAttribute('data-ylc-draggable-frame'))
	const resizable = findDeep(element => element.hasAttribute('data-ylc-resizable'))
	const chatInner = findDeep(element => element.hasAttribute('data-ylc-chat-inner'))
	const settingsButton = findDeep(element => element.hasAttribute('data-ylc-settings-btn'))
	const dragHandle = findDeep(element => element.getAttribute('aria-roledescription') === 'drag handle')
	const extensionIframe = findDeep(element => element.matches?.('iframe[data-ylc-chat="true"]'))

	return {
		url: window.location.href,
		fullscreen: document.fullscreenElement !== null,
		overlayMounted: Boolean(findDeep(element => element.hasAttribute('data-ylc-overlay-container'))),
		elements: {
			resizable: rectOf(resizable),
			frame: rectOf(frame),
			chatInner: rectOf(chatInner),
			controlRail: rectOf(controlRail),
			settingsButton: rectOf(settingsButton),
			dragHandle: rectOf(dragHandle),
			extensionIframe: rectOf(extensionIframe),
		},
	}
}

const waitFor = async (page, predicate, errorMessage) => {
	const deadline = Date.now() + timeout
	while (Date.now() < deadline) {
		const value = await predicate().catch(() => null)
		if (value) return value
		await page.waitForTimeout(200)
	}
	throw new Error(errorMessage)
}

const rectCenter = rect => ({
	x: rect.x + rect.width / 2,
	y: rect.y + rect.height / 2,
})

const muteVideos = async page => {
	await page
		.evaluate(() => {
			for (const video of document.querySelectorAll('video')) {
				video.volume = 0
				video.muted = true
			}
		})
		.catch(() => null)
}

try {
	const pages = browser.contexts().flatMap(context => context.pages())
	const page = pages.find(candidate => candidate.url().includes(targetUrlPart))

	if (!page) {
		console.error(`No page found for url fragment: ${targetUrlPart}`)
		console.error(`Open one with: yarn verify:browser --port ${port}`)
		process.exit(1)
	}

	await fs.mkdir(outDir, { recursive: true })
	await page.bringToFront()
	await muteVideos(page)

	const screenshots = []
	const states = []

	const capture = async (name, label) => {
		const file = path.join(outDir, name)
		await page.screenshot({ path: file, fullPage: false })
		const state = await page.evaluate(deepOverlayState)
		screenshots.push({ label, file })
		states.push({ label, state })
		return file
	}

	await capture('01-watch-page-before-fullscreen.png', 'watch page before fullscreen')

	const isAlreadyFullscreen = await page.evaluate(() => document.fullscreenElement !== null)
	if (!isAlreadyFullscreen) {
		const fullscreenRect = await waitFor(
			page,
			() =>
				page.evaluate(() => {
					const buttons = Array.from(document.querySelectorAll('button.ytp-fullscreen-button, .ytp-fullscreen-button'))
					const button = buttons.find(element => {
						const rect = element.getBoundingClientRect()
						const style = window.getComputedStyle(element)
						return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
					})
					if (!button) return null
					const rect = button.getBoundingClientRect()
					return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
				}),
			'Fullscreen button was not visible.',
		)

		const fullscreenCenter = rectCenter(fullscreenRect)
		await page.mouse.move(fullscreenCenter.x, fullscreenCenter.y)
		await page.mouse.click(fullscreenCenter.x, fullscreenCenter.y)
	}

	await waitFor(
		page,
		() =>
			page.evaluate(() => {
				const findDeep = predicate => {
					let found = null
					const walk = root => {
						for (const element of root.querySelectorAll('*')) {
							if (predicate(element)) {
								found = element
								return
							}
							if (element.shadowRoot) {
								walk(element.shadowRoot)
								if (found) return
							}
						}
					}
					walk(document)
					return found
				}

				return document.fullscreenElement !== null && Boolean(findDeep(element => element.hasAttribute('data-ylc-resizable')))
			}),
		'Fullscreen overlay did not mount.',
	)

	await page.waitForTimeout(500)
	await page.mouse.move(5, 5)
	await page.waitForTimeout(300)
	await capture('02-fullscreen-overlay-no-hover.png', 'fullscreen overlay without hover')

	const chatRect = await waitFor(
		page,
		async () => {
			const state = await page.evaluate(deepOverlayState)
			return state.elements.chatInner
		},
		'Chat inner was not found.',
	)
	await page.mouse.move(chatRect.x + Math.min(80, chatRect.width / 2), chatRect.y + Math.min(80, chatRect.height / 2))
	await page.waitForTimeout(400)
	await capture('03-fullscreen-overlay-hover.png', 'fullscreen overlay hover')

	const handleRect = await waitFor(
		page,
		async () => {
			const state = await page.evaluate(deepOverlayState)
			return state.elements.dragHandle
		},
		'Drag handle was not found.',
	)
	const handleCenter = rectCenter(handleRect)
	await page.mouse.move(handleCenter.x, handleCenter.y)
	await page.mouse.down()
	for (let step = 1; step <= 16; step += 1) {
		await page.mouse.move(handleCenter.x + step * 10, handleCenter.y + step * 5)
	}
	await page.mouse.up()
	await page.waitForTimeout(500)
	await capture('04-fullscreen-overlay-after-drag.png', 'fullscreen overlay after drag')

	const loweredHandleRect = await waitFor(
		page,
		async () => {
			const state = await page.evaluate(deepOverlayState)
			return state.elements.dragHandle
		},
		'Drag handle was not found after first drag.',
	)
	const loweredHandleCenter = rectCenter(loweredHandleRect)
	await page.mouse.move(loweredHandleCenter.x, loweredHandleCenter.y)
	await page.mouse.down()
	for (let step = 1; step <= 20; step += 1) {
		await page.mouse.move(loweredHandleCenter.x + step * 12, loweredHandleCenter.y + step * 15)
	}
	await page.mouse.up()
	await page.waitForTimeout(500)
	const bottomChatRect = await waitFor(
		page,
		async () => {
			const state = await page.evaluate(deepOverlayState)
			return state.elements.chatInner
		},
		'Chat inner was not found near bottom.',
	)
	await page.mouse.move(bottomChatRect.x + Math.min(80, bottomChatRect.width / 2), bottomChatRect.y + Math.min(80, bottomChatRect.height / 2))
	await page.waitForTimeout(400)
	await capture('05-fullscreen-overlay-near-bottom-hover.png', 'fullscreen overlay near bottom hover')

	const summaryFile = path.join(outDir, 'summary.json')
	await fs.writeFile(
		summaryFile,
		JSON.stringify(
			{
				port,
				targetUrlPart,
				outDir,
				screenshots,
				states,
			},
			null,
			2,
		),
	)

	console.log(JSON.stringify({ outDir, summaryFile, screenshots }, null, 2))
} finally {
	await browser.close().catch(() => null)
}
