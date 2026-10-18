import type { Page } from '@playwright/test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureArchiveNativeChatPlayable } from './diagnostics'
import { PAGE_HELPERS_INIT_SCRIPT } from './pageHelpers'

// A production selector regression must not make a usable YouTube source look
// unavailable to the canary. Only the product catalog is broken in this fixture.
vi.mock('../../entrypoints/content/platform/youtube/selectorCatalog', async importOriginal => {
  const actual = await importOriginal<typeof import('../../entrypoints/content/platform/youtube/selectorCatalog')>()
  return {
    ...actual,
    archiveSidebarOpenSelectors: ['#broken-production-sidebar'],
    archivePlayerChatToggleSelectors: ['#broken-production-player-toggle'],
  }
})

const originalHelpers = Object.getOwnPropertyDescriptor(window, '__ylcHelpers')

beforeEach(() => {
  PAGE_HELPERS_INIT_SCRIPT()
  // jsdom has no layout. Keep the visibility policy real, supplying only its
  // browser-owned geometry; hidden/disabled controls remain part of the fixture.
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect(0, 0, 40, 40)] as unknown as DOMRectList)
})

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  if (originalHelpers) Object.defineProperty(window, '__ylcHelpers', originalHelpers)
  else Reflect.deleteProperty(window, '__ylcHelpers')
})

const createPage = () => {
  let elapsed = 0
  vi.spyOn(Date, 'now').mockImplementation(() => elapsed)
  return {
    evaluate: async (callback: (argument: unknown) => unknown, argument: unknown) => callback(argument),
    waitForTimeout: async (duration: number) => {
      elapsed += duration
    },
  } as unknown as Page
}

const installReplayOnOpen = () => {
  const open = document.querySelector<HTMLElement>('[data-open-replay]')
  if (!open) throw new Error('Missing fixture replay control')
  open.addEventListener('click', () => {
    open.setAttribute('aria-expanded', 'true')
    open.setAttribute('aria-pressed', 'true')
    let host = document.querySelector('ytd-live-chat-frame')
    if (!host) {
      host = document.createElement('ytd-live-chat-frame')
      document.body.append(host)
    }
    const iframe = document.createElement('iframe')
    iframe.id = 'chatframe'
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=archive-fixture'
    host.append(iframe)
    const chatDocument = iframe.contentDocument
    if (!chatDocument) throw new Error('Missing native replay document')
    chatDocument.write(
      '<!doctype html><body><yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer></yt-live-chat-renderer></body>',
    )
    chatDocument.close()
  })
  for (const unwanted of document.querySelectorAll<HTMLElement>('[data-unwanted]')) {
    unwanted.addEventListener('click', () => unwanted.setAttribute('data-clicked', 'true'))
  }
  return open
}

const expectOpenedReplay = (open: HTMLElement) => {
  expect(open.getAttribute('aria-expanded')).toBe('true')
  expect(document.querySelectorAll('[data-unwanted][data-clicked]')).toHaveLength(0)
  const iframe = document.querySelector<HTMLIFrameElement>('ytd-live-chat-frame > iframe#chatframe')
  expect(iframe?.contentDocument?.location.pathname).toBe('/live_chat_replay')
  expect(iframe?.contentDocument?.querySelector('yt-live-chat-renderer > yt-live-chat-item-list-renderer')).not.toBeNull()
}

describe('archive canary source opening', () => {
  it.each(['getNativeIframe', 'resolveClickable'] as const)(
    'propagates a broken %s helper instead of reporting unavailable replay',
    async helper => {
      document.body.innerHTML = `
      <ytd-live-chat-frame><div id="show-hide-button">
        <button data-open-replay>Show chat replay</button>
      </div></ytd-live-chat-frame>
    `
      installReplayOnOpen()
      const error = new TypeError(`Broken native ${helper} helper`)
      vi.spyOn(window.__ylcHelpers, helper).mockImplementation(() => {
        throw error
      })

      await expect(ensureArchiveNativeChatPlayable(createPage(), { maxDurationMs: 2000 })).rejects.toBe(error)
    },
  )

  it('reports unavailable replay when YouTube exposes neither a source nor an opening control', async () => {
    document.body.innerHTML = '<div id="movie_player"><div class="ytp-right-controls"></div></div>'

    await expect(ensureArchiveNativeChatPlayable(createPage(), { maxDurationMs: 2000 })).resolves.toBe(false)
  })

  it.each([
    [
      'native sidebar',
      `<ytd-live-chat-frame><div id="show-hide-button">
        <button data-unwanted hidden>Hidden chat</button>
        <button data-unwanted disabled>Disabled chat</button>
        <button data-unwanted aria-disabled="true">Unavailable chat</button>
        <button data-open-replay>Show chat replay</button>
      </div></ytd-live-chat-frame>`,
    ],
    [
      'container sidebar',
      `<div id="chat-container"><div id="show-hide-button">
        <button data-unwanted disabled>Disabled chat</button>
        <yt-icon-button data-open-replay role="button" aria-label="Show chat replay"></yt-icon-button>
      </div></div>`,
    ],
  ])('opens %s despite broken product selectors', async (_name, markup) => {
    document.body.innerHTML = markup
    const open = installReplayOnOpen()
    expect(document.querySelector('iframe#chatframe')).toBeNull()

    expect(await ensureArchiveNativeChatPlayable(createPage(), { maxDurationMs: 2000 })).toBe(true)

    expectOpenedReplay(open)
  })

  it.each([
    ['toggle-button-view-model', 'Show chat replay'],
    ['button-view-model', 'チャットを表示'],
  ])('opens a labeled %s without toggling captions or disabled chat', async (viewModel, label) => {
    document.body.innerHTML = `
      <div id="movie_player"><div class="ytp-right-controls">
        <toggle-button-view-model><button data-unwanted disabled aria-pressed="false" aria-label="Show chat">Disabled</button></toggle-button-view-model>
        <button-view-model><button data-unwanted aria-pressed="false" aria-label="Subtitles">Captions</button></button-view-model>
        <${viewModel}><button data-open-replay aria-pressed="false" aria-label="${label}">Replay</button></${viewModel}>
      </div></div>
    `
    const open = installReplayOnOpen()

    expect(await ensureArchiveNativeChatPlayable(createPage(), { maxDurationMs: 2000 })).toBe(true)

    expect(open.getAttribute('aria-pressed')).toBe('true')
    expectOpenedReplay(open)
  })
})
