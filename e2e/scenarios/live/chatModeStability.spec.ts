import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { captureChatState, ensureArchiveNativeChatPlayable, isNativeLiveChatPlayable, openArchiveWatchPage } from '@e2e/support/diagnostics'

/**
 * detectChatMode() がページ読み込み初期にモード振動を起こすかを検証する。
 *
 * v2.3.6 の変更で hasArchiveNativeOpenControl() が true のとき
 * movie_player.getVideoData().isLive をクロスチェックするようになった。
 * メタデータ未ロード時に null が返ると fall through し、
 * mode が none → live → archive と振動する可能性がある。
 */

/** detectChatMode と同等のロジックをブラウザ内で実行してモードを推定する */
const sampleDetectChatMode = () => {
	const h = window.__ylcHelpers
	const nativeIframe = h.getNativeIframe()
	const nativeHref = h.readIframeHref(nativeIframe)

	const moviePlayer = document.getElementById('movie_player') as
		| (HTMLElement & { getVideoData?: () => { isLive?: boolean; isLiveContent?: boolean } })
		| null
	const videoData = moviePlayer?.getVideoData?.()
	const isLiveFlag = typeof videoData?.isLive === 'boolean' ? videoData.isLive : null
	const isLiveContentFlag = typeof videoData?.isLiveContent === 'boolean' ? videoData.isLiveContent : null

	const hasShowHideButton = Boolean(
		document.querySelector('ytd-live-chat-frame #show-hide-button button') ||
			document.querySelector('#chat-container #show-hide-button button'),
	)

	const isLiveNow = h.isLiveNow()

	// extension iframe のチェック
	const extensionIframe = h.getExtensionIframe()
	const extensionHref = h.readIframeHref(extensionIframe)

	let mode: string
	if (extensionHref.includes('/live_chat_replay')) {
		mode = 'archive'
	} else if (extensionHref.includes('/live_chat')) {
		mode = 'live'
	} else if (nativeHref.includes('/live_chat_replay')) {
		mode = 'archive'
	} else if (nativeHref.includes('/live_chat')) {
		mode = 'live'
	} else if (isLiveNow) {
		mode = 'live'
	} else if (hasShowHideButton) {
		if (isLiveFlag === true) mode = 'live'
		else if (isLiveFlag === false) mode = 'archive'
		else mode = 'none-fallthrough'
	} else if (isLiveFlag === true || isLiveContentFlag === true) {
		mode = 'live'
	} else {
		mode = 'none'
	}

	return {
		mode,
		isLiveFlag,
		isLiveContentFlag,
		isLiveNow,
		hasShowHideButton,
		nativeHref: nativeHref.slice(0, 80),
		extensionHref: extensionHref.slice(0, 80),
	}
}

type ModeSample = ReturnType<typeof sampleDetectChatMode> & { ts: number }

/** 指定時間モードをサンプリングして遷移を返す */
const collectModeHistory = (durationMs: number) => {
	return new Promise<ModeSample[]>(resolve => {
		const history: ModeSample[] = []
		const startTime = Date.now()
		const interval = setInterval(() => {
			const sample = (window as Window & { __sampleDetectChatMode: typeof sampleDetectChatMode }).__sampleDetectChatMode()
			history.push({ ...sample, ts: Date.now() - startTime })
			if (Date.now() - startTime >= durationMs) {
				clearInterval(interval)
				resolve(history)
			}
		}, 200)
	})
}

const extractTransitions = (history: ModeSample[]) =>
	history.reduce<ModeSample[]>((acc, entry) => {
		if (acc.length === 0 || acc[acc.length - 1].mode !== entry.mode) {
			acc.push(entry)
		}
		return acc
	}, [])

test.describe('chat mode stability on live page', { tag: '@live' }, () => {
	test('detectChatMode should not oscillate during page load', async ({ page, liveUrl }) => {
		test.setTimeout(180000)

		if (!liveUrl) {
			test.skip(true, 'No live URL with chat found.')
			return
		}

		const yt = new YouTubeWatchPage(page)

		await page.addInitScript(sampleDetectChatMode)
		await page.addInitScript(`window.__sampleDetectChatMode = ${sampleDetectChatMode.toString()}`)

		await yt.goto(liveUrl)

		const nativeReady = await page.waitForFunction(isNativeLiveChatPlayable, { timeout: 30000 }).then(
			() => true,
			() => false,
		)
		if (!nativeReady) {
			await captureChatState(page, test.info(), 'mode-stability-native-precondition-missing')
			test.skip(true, 'Native chat source was not playable.')
			return
		}

		const modeHistory = await page.evaluate(collectModeHistory, 10000)

		await test.info().attach('mode-history', {
			body: JSON.stringify(modeHistory, null, 2),
			contentType: 'application/json',
		})

		const modeTransitions = extractTransitions(modeHistory)

		await test.info().attach('mode-transitions', {
			body: JSON.stringify(modeTransitions, null, 2),
			contentType: 'application/json',
		})

		const finalMode = modeHistory[modeHistory.length - 1]?.mode
		expect(finalMode).toBe('live')

		expect(
			modeTransitions.length,
			`Mode oscillated ${modeTransitions.length} times: ${modeTransitions.map(t => `${t.mode}@${t.ts}ms`).join(' → ')}`,
		).toBeLessThanOrEqual(2)
	})

	test('fullscreen layout fix should not activate before iframe exists', async ({ page, liveUrl }) => {
		test.setTimeout(180000)

		if (!liveUrl) {
			test.skip(true, 'No live URL with chat found.')
			return
		}

		const yt = new YouTubeWatchPage(page)
		const overlay = new ExtensionOverlay(page)

		await yt.goto(liveUrl)

		// ネイティブチャット準備待ち
		const nativeReady = await page.waitForFunction(isNativeLiveChatPlayable, { timeout: 30000 }).then(
			() => true,
			() => false,
		)
		if (!nativeReady) {
			await captureChatState(page, test.info(), 'layout-fix-native-precondition-missing')
			test.skip(true, 'Native chat source was not playable.')
			return
		}

		// フルスクリーン前にレイアウト修正 CSS が無いことを確認
		const hasLayoutFixBefore = await page.evaluate(
			() => document.documentElement.classList.contains('ylc-fullscreen-chat-fix'),
		)
		expect(hasLayoutFixBefore).toBe(false)

		await yt.enterFullscreen()

		// スイッチが表示されるまで待機
		const switchReady = await overlay.waitForSwitchReady()
		if (!switchReady) {
			await captureChatState(page, test.info(), 'layout-fix-switch-missing')
			test.skip(true, 'Fullscreen chat switch button did not appear.')
			return
		}

		// レイアウト修正 CSS と拡張 iframe の出現タイミングを記録
		const timingData = await page.evaluate(() => {
			return new Promise<{
				layoutFixAppliedAt: number | null
				iframeAppearedAt: number | null
				samples: Array<{
					ts: number
					hasLayoutFix: boolean
					hasExtensionIframe: boolean
					iframeHref: string
				}>
			}>(resolve => {
				const h = window.__ylcHelpers
				const startTime = Date.now()
				let layoutFixAppliedAt: number | null = null
				let iframeAppearedAt: number | null = null
				const samples: Array<{
					ts: number
					hasLayoutFix: boolean
					hasExtensionIframe: boolean
					iframeHref: string
				}> = []

				const interval = setInterval(() => {
					const hasLayoutFix = document.documentElement.classList.contains('ylc-fullscreen-chat-fix')
					const extensionIframe = h.getExtensionIframe()
					const iframeHref = h.readIframeHref(extensionIframe)
					const hasIframe = Boolean(extensionIframe && iframeHref && !iframeHref.includes('about:blank'))
					const ts = Date.now() - startTime

					if (hasLayoutFix && layoutFixAppliedAt === null) {
						layoutFixAppliedAt = ts
					}
					if (hasIframe && iframeAppearedAt === null) {
						iframeAppearedAt = ts
					}

					samples.push({
						ts,
						hasLayoutFix,
						hasExtensionIframe: hasIframe,
						iframeHref: iframeHref || '',
					})

					if (Date.now() - startTime >= 20000) {
						clearInterval(interval)
						resolve({ layoutFixAppliedAt, iframeAppearedAt, samples })
					}
				}, 100)
			})
		})

		await test.info().attach('layout-fix-timing', {
			body: JSON.stringify(timingData, null, 2),
			contentType: 'application/json',
		})

		// レイアウト修正が適用された場合、iframe が存在する前に適用されていないことを確認
		if (timingData.layoutFixAppliedAt !== null && timingData.iframeAppearedAt !== null) {
			const gap = timingData.layoutFixAppliedAt - timingData.iframeAppearedAt
			// レイアウト修正が iframe 出現より 500ms 以上先に適用されていたら問題
			expect(
				gap,
				`Layout fix applied ${Math.abs(gap)}ms ${gap < 0 ? 'BEFORE' : 'after'} iframe appeared. ` +
					`layoutFix@${timingData.layoutFixAppliedAt}ms, iframe@${timingData.iframeAppearedAt}ms`,
			).toBeGreaterThanOrEqual(-500)
		}

		// レイアウト修正だけが適用されて iframe が来なかったケース
		if (timingData.layoutFixAppliedAt !== null && timingData.iframeAppearedAt === null) {
			// 20 秒以内に iframe が来ないのにレイアウト修正が適用されているのは問題
			expect(
				timingData.iframeAppearedAt,
				`Layout fix applied at ${timingData.layoutFixAppliedAt}ms but extension iframe never appeared within 20s`,
			).not.toBeNull()
		}
	})
})

test.describe('chat mode stability on archive page', { tag: '@archive' }, () => {
	test('detectChatMode should not oscillate on archive page load', async ({ page, archiveReplayUrl }) => {
		test.setTimeout(180000)

		if (!archiveReplayUrl) {
			test.skip(true, 'No archive replay URL available.')
			return
		}

		await page.addInitScript(`window.__sampleDetectChatMode = ${sampleDetectChatMode.toString()}`)

		const watchReady = await openArchiveWatchPage(page, archiveReplayUrl, { maxDurationMs: 30000 })
		if (!watchReady) {
			test.skip(true, 'Archive watch page did not load.')
			return
		}

		const chatPlayable = await ensureArchiveNativeChatPlayable(page, { maxDurationMs: 30000 })
		if (!chatPlayable) {
			await captureChatState(page, test.info(), 'archive-mode-stability-precondition-missing')
			test.skip(true, 'Archive native chat was not playable.')
			return
		}

		const modeHistory = await page.evaluate(collectModeHistory, 10000)

		await test.info().attach('archive-mode-history', {
			body: JSON.stringify(modeHistory, null, 2),
			contentType: 'application/json',
		})

		const modeTransitions = extractTransitions(modeHistory)

		await test.info().attach('archive-mode-transitions', {
			body: JSON.stringify(modeTransitions, null, 2),
			contentType: 'application/json',
		})

		const finalMode = modeHistory[modeHistory.length - 1]?.mode
		expect(finalMode).toBe('archive')

		// none → archive は許容（2 transitions まで）
		expect(
			modeTransitions.length,
			`Mode oscillated ${modeTransitions.length} times: ${modeTransitions.map(t => `${t.mode}@${t.ts}ms`).join(' → ')}`,
		).toBeLessThanOrEqual(2)

		// none-fallthrough が存在しないことを確認
		// （getMoviePlayerIsLive が null を返して fall through するケース）
		const hasFallthrough = modeHistory.some(s => s.mode === 'none-fallthrough')
		expect(
			hasFallthrough,
			`getMoviePlayerIsLive() returned null while hasArchiveNativeOpenControl() was true — ` +
				`this means detectChatMode fell through and could return wrong mode. ` +
				`Samples: ${modeHistory.filter(s => s.mode === 'none-fallthrough').map(s => `@${s.ts}ms`).join(', ')}`,
		).toBe(false)
	})

	test('getVideoData metadata availability timing', async ({ page, archiveReplayUrl }) => {
		test.setTimeout(180000)

		if (!archiveReplayUrl) {
			test.skip(true, 'No archive replay URL available.')
			return
		}

		// ページ遷移直後からメタデータの初期化タイミングを計測
		// addInitScript で遷移直後のタイミングを捕捉
		await page.addInitScript(() => {
			;(window as Window & { __metadataTimeline?: Array<Record<string, unknown>> }).__metadataTimeline = []
			const startTime = Date.now()
			const interval = setInterval(() => {
				const moviePlayer = document.getElementById('movie_player') as
					| (HTMLElement & { getVideoData?: () => { isLive?: boolean; isLiveContent?: boolean } })
					| null
				const hasMoviePlayer = Boolean(moviePlayer)
				const hasGetVideoData = typeof moviePlayer?.getVideoData === 'function'
				let videoData: { isLive?: boolean; isLiveContent?: boolean } | null = null
				try {
					videoData = hasGetVideoData ? moviePlayer!.getVideoData!() : null
				} catch {
					// ignore
				}

				const hasShowHideButton = Boolean(
					document.querySelector('ytd-live-chat-frame #show-hide-button button') ||
						document.querySelector('#chat-container #show-hide-button button'),
				)

				const timeline = (window as Window & { __metadataTimeline?: Array<Record<string, unknown>> }).__metadataTimeline
				timeline?.push({
					ts: Date.now() - startTime,
					hasMoviePlayer,
					hasGetVideoData,
					isLive: videoData?.isLive ?? null,
					isLiveContent: videoData?.isLiveContent ?? null,
					hasShowHideButton,
				})

				if (Date.now() - startTime >= 15000) {
					clearInterval(interval)
				}
			}, 100)
		})

		await page.goto(archiveReplayUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

		// 15秒待ってタイムラインを取得
		await page.waitForTimeout(15000)

		const timeline = await page.evaluate(
			() => (window as Window & { __metadataTimeline?: Array<Record<string, unknown>> }).__metadataTimeline ?? [],
		)

		await test.info().attach('metadata-timeline', {
			body: JSON.stringify(timeline, null, 2),
			contentType: 'application/json',
		})

		// hasShowHideButton が true になった最初のサンプルと
		// isLive が boolean になった最初のサンプルのタイミング差を確認
		const firstShowHide = timeline.find(s => s.hasShowHideButton === true)
		const firstIsLive = timeline.find(s => typeof s.isLive === 'boolean')

		await test.info().attach('metadata-timing-summary', {
			body: JSON.stringify(
				{
					firstShowHideButtonAt: firstShowHide?.ts ?? null,
					firstIsLiveAvailableAt: firstIsLive?.ts ?? null,
					gap: firstShowHide && firstIsLive ? Number(firstIsLive.ts) - Number(firstShowHide.ts) : null,
					totalSamples: timeline.length,
					dangerWindowSamples: timeline.filter(
						s => s.hasShowHideButton === true && s.isLive === null,
					).length,
				},
				null,
				2,
			),
			contentType: 'application/json',
		})

		// 危険ウィンドウの大きさを報告（hasShowHideButton=true だが isLive=null のサンプル数）
		const dangerSamples = timeline.filter(
			s => s.hasShowHideButton === true && s.isLive === null,
		)
		// 危険ウィンドウがある場合はモード振動リスクを警告として記録
		if (dangerSamples.length > 0) {
			await test.info().attach('danger-window-warning', {
				body: `WARNING: ${dangerSamples.length} samples (${dangerSamples.length * 100}ms) where ` +
					`hasArchiveNativeOpenControl()=true but getMoviePlayerIsLive()=null. ` +
					`During this window, detectChatMode falls through and may return wrong mode. ` +
					`First danger sample at ${dangerSamples[0].ts}ms, last at ${dangerSamples[dangerSamples.length - 1].ts}ms.`,
				contentType: 'text/plain',
			})
		}
	})
})
