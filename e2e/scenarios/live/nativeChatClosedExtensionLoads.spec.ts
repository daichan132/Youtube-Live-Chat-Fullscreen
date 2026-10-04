import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { hasPlayableChat } from '@e2e/support/diagnostics'
import { meetsExternalYouTubePrecondition } from '@e2e/support/externalYouTubePreconditions'
import { closeNativeChat } from '@e2e/utils/nativeChat'
import type { Page } from '@playwright/test'

const expectSelectedLivePlayerReady = async (page: Page, videoId: string) => {
  const skipAd = page.getByRole('button', { name: /^(Skip(?: ads?)?|広告をスキップ)$/i }).first()
  await expect
    .poll(
      async () => {
        const state = await page.evaluate(expectedVideoId => {
          const player = document.getElementById('movie_player') as
            | (HTMLElement & { getVideoData?: () => { video_id?: string; videoId?: string; isLive?: boolean } })
            | null
          const url = new URL(window.location.href)
          const watchVideoId =
            url.searchParams.get('v') ??
            /^\/live\/([^/]+)\/?$/.exec(url.pathname)?.[1] ??
            document.querySelector('ytd-watch-flexy, ytd-watch-grid')?.getAttribute('video-id') ??
            null
          let data: { video_id?: string; videoId?: string; isLive?: boolean } | null = null
          try {
            data = player?.getVideoData?.() ?? null
          } catch {
            // YouTube can temporarily replace its player while an advertisement ends.
          }
          const playerVideoId = data?.video_id ?? data?.videoId ?? player?.getAttribute('video-id') ?? null
          return {
            advertising: player?.classList.contains('ad-showing') === true || player?.classList.contains('ad-interrupting') === true,
            selectedVideo: watchVideoId === expectedVideoId && playerVideoId === expectedVideoId,
            live: data?.isLive === true,
          }
        }, videoId)
        if (state.advertising && (await skipAd.isVisible())) {
          // Use YouTube's UI; a disappearing skip button is handled by the next readiness poll.
          await skipAd.click({ timeout: 1500 }).catch(() => {})
        }
        return state
      },
      { timeout: 45000, intervals: [100, 250, 500, 1000], message: 'Selected live player must resume after advertising before chat controls are tested.' },
    )
    .toEqual({ advertising: false, selectedVideo: true, live: true })
}

test.describe('native chat closed extension loads', { tag: '@live' }, () => {
  test('extension chat loads when native chat is closed', async ({ page, liveUrl }) => {
    test.setTimeout(140000)

    if (!liveUrl) {
      test.skip(true, 'No live URL with playable chat found from configured targets/search.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)
    const selectedUrl = new URL(liveUrl)
    let selectedVideoId = selectedUrl.searchParams.get('v') ?? /^\/live\/([^/]+)\/?$/.exec(selectedUrl.pathname)?.[1] ?? null

    await yt.goto(liveUrl)
    await expect
      .poll(
        async () => {
          if (!selectedVideoId) {
            selectedVideoId = await page.evaluate(() => {
              const url = new URL(window.location.href)
              const ids = new Set<string>()
              const urlVideoId = url.searchParams.get('v') ?? /^\/live\/([^/]+)\/?$/.exec(url.pathname)?.[1]
              if (urlVideoId) ids.add(urlVideoId)
              for (const watch of document.querySelectorAll('ytd-watch-flexy, ytd-watch-grid')) {
                const id = watch.getAttribute('video-id')
                if (id) ids.add(id)
              }
              return ids.size === 1 ? [...ids][0] ?? null : null
            })
          }
          return selectedVideoId !== null
        },
        { timeout: 10000, message: 'The selected live entry must expose one concrete watch video identity.' },
      )
      .toBe(true)
    if (!selectedVideoId) throw new Error('The selected live entry did not identify a video.')

    const nativeFrameReady = await meetsExternalYouTubePrecondition('native-chat-frame', () => yt.expectNativeChat())
    if (!nativeFrameReady) {
      test.skip(true, 'Live URL did not expose a native chat frame.')
      return
    }
    const nativeUsable = await meetsExternalYouTubePrecondition('native-chat-source', () =>
      expect.poll(async () => page.evaluate(() => window.__ylcHelpers.isNativeChatUsable())).toBe(true),
    )
    if (!nativeUsable) {
      test.skip(true, 'Selected live video did not expose a usable native chat source.')
      return
    }
    const playable = await meetsExternalYouTubePrecondition('native-chat-source', () =>
      expect.poll(async () => page.evaluate(hasPlayableChat), { timeout: 20000 }).toBe(true),
    )
    if (!playable) {
      test.skip(true, 'Selected live video did not have playable chat.')
      return
    }
    await expectSelectedLivePlayerReady(page, selectedVideoId)
    const closed = await closeNativeChat(page)
    if (!closed) {
      test.skip(true, 'Could not close native chat via UI controls.')
      return
    }
    const nativeClosed = await meetsExternalYouTubePrecondition('chat-close-ui', () =>
      expect.poll(async () => page.evaluate(() => window.__ylcHelpers.isNativeChatUsable())).toBe(false),
    )
    if (!nativeClosed) {
      test.skip(true, 'YouTube did not settle the native chat close operation.')
      return
    }

    await expectSelectedLivePlayerReady(page, selectedVideoId)

    const fullscreenReady = await meetsExternalYouTubePrecondition('fullscreen-ui', () => yt.enterFullscreen())
    if (!fullscreenReady) {
      test.skip(true, 'YouTube fullscreen UI did not meet the canary precondition.')
      return
    }

    await overlay.expectSwitchReady()
    await overlay.toggleOn()
    await overlay.expectChatLoaded()
    await expect
      .poll(() =>
        page.evaluate(() => {
          const iframe = window.__ylcHelpers.getExtensionIframe()
          return {
            owned: iframe?.getAttribute('data-ylc-owned') ?? null,
            source: iframe?.getAttribute('data-ylc-source') ?? null,
          }
        }),
      )
      .toEqual({ owned: 'true', source: 'live_direct' })
  })
})
