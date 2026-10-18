import type { Page } from '@playwright/test'
import { errors } from '@playwright/test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PAGE_HELPERS_INIT_SCRIPT } from '../support/pageHelpers'
import { findLiveUrlWithChat } from './liveUrl'

// Worker-to-worker disk caching is outside these discovery cases. Keep the
// real DOM decisions while isolating them from another browser run's cache.
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: () => {
        throw Object.assign(new Error('No cached live URL'), { code: 'ENOENT' })
      },
      writeFileSync: () => {},
    },
  }
})

const liveUrl = 'https://www.youtube.com/watch?v=live-discovery-fixture'
const searchUrl = 'https://www.youtube.com/results?search_query=fixture'
const originalHelpers = Object.getOwnPropertyDescriptor(window, '__ylcHelpers')

beforeEach(() => {
  vi.stubEnv('YLC_LIVE_URL', liveUrl)
  PAGE_HELPERS_INIT_SCRIPT()
})

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllEnvs()
  if (originalHelpers) Object.defineProperty(window, '__ylcHelpers', originalHelpers)
  else Reflect.deleteProperty(window, '__ylcHelpers')
})

const mountSource = (state: 'ready' | 'unavailable' | 'missing') => {
  document.body.innerHTML =
    '<ytd-watch-flexy is-live-now><div id="movie_player"></div><ytd-live-chat-frame></ytd-live-chat-frame></ytd-watch-flexy>'
  if (state === 'missing') return
  const iframe = document.createElement('iframe')
  iframe.id = 'chatframe'
  iframe.src = liveUrl.replace('/watch?', '/live_chat?')
  document.querySelector('ytd-live-chat-frame')?.append(iframe)
  const doc = iframe.contentDocument
  if (!doc) throw new Error('Missing fixture chat document')
  doc.write(
    state === 'unavailable'
      ? '<yt-live-chat-unavailable-message-renderer>Chat is disabled</yt-live-chat-unavailable-message-renderer>'
      : '<yt-live-chat-renderer><yt-live-chat-item-list-renderer><yt-live-chat-text-message-renderer>A viewer quoted "chat is disabled".</yt-live-chat-text-message-renderer></yt-live-chat-item-list-renderer></yt-live-chat-renderer>',
  )
  doc.close()
}

const createPage = (
  options: { state?: 'ready' | 'unavailable' | 'missing'; fault?: 'navigation' | 'consent' | 'search'; error?: Error } = {},
) => {
  let currentUrl = 'about:blank'
  return {
    async goto(url: string) {
      if (options.fault === 'navigation') throw options.error
      currentUrl = url
      if (url === searchUrl)
        document.body.innerHTML = `<ytd-video-renderer><a id="thumbnail" href="${liveUrl}">Live fixture</a></ytd-video-renderer>`
      else mountSource(options.state ?? 'ready')
    },
    url: () => currentUrl,
    context: () => ({ addCookies: async () => {} }),
    locator: () => ({
      first: () => ({
        isVisible: async () => {
          if (options.fault === 'consent') throw options.error
          return false
        },
      }),
    }),
    async waitForSelector(selector: string) {
      const element = document.querySelector(selector)
      if (!element) throw new errors.TimeoutError('YouTube source did not expose the requested element')
      return element
    },
    async waitForFunction(predicate: () => unknown) {
      if (options.fault === 'search' && currentUrl === searchUrl) throw options.error
      const value = predicate()
      if (!value) throw new errors.TimeoutError('YouTube source did not become ready')
      return { jsonValue: async () => value }
    },
    evaluate: async (callback: () => unknown) => callback(),
  } as unknown as Page
}

describe('live canary source discovery', () => {
  it('selects a real ready chat even when a viewer quotes an unavailable phrase', async () => {
    await expect(findLiveUrlWithChat(createPage(), { searchUrls: [] })).resolves.toBe(liveUrl)
  })

  it.each(['unavailable', 'missing'] as const)('returns no source for a genuinely %s chat', async state => {
    await expect(findLiveUrlWithChat(createPage({ state }), { searchUrls: [] })).resolves.toBeNull()
  })

  it('propagates a broken injected helper instead of reporting no live source', async () => {
    const error = new TypeError('Injected live helper failed')
    window.__ylcHelpers.isLiveNow = () => {
      throw error
    }
    await expect(findLiveUrlWithChat(createPage(), { searchUrls: [] })).rejects.toBe(error)
  })

  it.each(['navigation', 'consent', 'search'] as const)('propagates an unexpected %s error', async fault => {
    const error = new Error('Browser context closed')
    if (fault === 'search') vi.stubEnv('YLC_LIVE_URL', '')
    await expect(findLiveUrlWithChat(createPage({ fault, error }), { searchUrls: [searchUrl] })).rejects.toBe(error)
  })
})
