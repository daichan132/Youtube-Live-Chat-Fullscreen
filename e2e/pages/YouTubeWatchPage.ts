import type { Page } from '@playwright/test'
import { TIMEOUT } from '../support/constants'
import { acceptYouTubeConsent } from '../utils/liveUrl'
import { FULLSCREEN_BUTTON, MOVIE_PLAYER, NATIVE_CHAT_FRAME } from '../utils/selectors'

export class YouTubeWatchPage {
  constructor(private page: Page) {}

  async goto(url: string, options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.PAGE_GOTO
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout })
    await acceptYouTubeConsent(this.page)
    if (this.page.url().includes('consent')) {
      await this.page.waitForTimeout(1500)
      await acceptYouTubeConsent(this.page)
    }
    await this.page.waitForSelector(MOVIE_PLAYER, { state: 'attached', timeout: 10000 })
  }

  async enterFullscreen(options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.FULLSCREEN
    await this.page.locator(MOVIE_PLAYER).hover()
    await this.page.click(FULLSCREEN_BUTTON)
    await this.page.waitForFunction(() => document.fullscreenElement !== null, { timeout })
  }

  async exitFullscreen(options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.FULLSCREEN
    await this.page.locator(MOVIE_PLAYER).hover()
    await this.page.click(FULLSCREEN_BUTTON)
    await this.page
      .waitForFunction(() => document.fullscreenElement === null, { timeout })
      .then(
        () => true,
        () => false,
      )
  }

  async waitForNativeChat(options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.NATIVE_CHAT_FRAME
    return this.page.waitForSelector(NATIVE_CHAT_FRAME, { state: 'attached', timeout }).then(
      () => true,
      () => false,
    )
  }

  async isLiveNow() {
    return this.page.evaluate(isLiveNow).then(Boolean, () => false)
  }

  async isInFullscreen() {
    return this.page.evaluate(() => document.fullscreenElement !== null)
  }
}

const isLiveNow = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  if (watchFlexy?.hasAttribute('is-live-now') || watchGrid?.hasAttribute('is-live-now')) return true

  const moviePlayer = document.getElementById('movie_player') as (HTMLElement & { getVideoData?: () => { isLive?: boolean } }) | null
  const videoData = moviePlayer?.getVideoData?.()
  if (typeof videoData?.isLive === 'boolean') return videoData.isLive

  const response = (
    window as Window & {
      ytInitialPlayerResponse?: {
        microformat?: {
          playerMicroformatRenderer?: {
            liveBroadcastDetails?: {
              isLiveNow?: boolean
            }
          }
        }
        videoDetails?: {
          isLive?: boolean
        }
      }
    }
  ).ytInitialPlayerResponse

  const liveBroadcastNow = response?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow
  if (typeof liveBroadcastNow === 'boolean') return liveBroadcastNow

  const videoDetailsLive = response?.videoDetails?.isLive
  if (typeof videoDetailsLive === 'boolean') return videoDetailsLive

  return false
}
