import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openArchiveNativeChatPanel } from '../../utils/nativeChat'
import { collectArchiveChatControls, isChatControl } from './chatControls'

const VIDEO_ID = 'current-video'

const createHost = (id = VIDEO_ID) => {
  const host = document.createElement('ytd-live-chat-frame')
  host.id = `chat-${id}`
  host.setAttribute('data-ylc-observed-video-id', id)
  document.body.appendChild(host)
  return host
}

const createPlayer = (host: HTMLElement) => {
  const player = document.createElement('div')
  player.id = 'movie_player'
  player.innerHTML = '<div class="ytp-right-controls"><toggle-button-view-model><button aria-pressed="false" aria-label="Chat replay"></button></toggle-button-view-model></div>'
  document.body.appendChild(player)
  const button = player.querySelector('button')!
  button.setAttribute('aria-controls', host.id)
  return { player, button }
}

beforeEach(() => {
  document.body.replaceChildren()
  window.history.replaceState({}, '', `/watch?v=${VIDEO_ID}`)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

describe('chat control action boundaries', () => {
  it('does not override an explicit stale relationship with a chat label', () => {
    const stale = createHost('previous-video')
    createHost()
    const { button } = createPlayer(stale)

    expect(isChatControl(button)).toBe(false)
    expect(collectArchiveChatControls()).toMatchObject({ native: null, replay: null, canOpen: false })
    expect(openArchiveNativeChatPanel()).toBe(false)
  })

  it('does not rediscover a disabled inner button through its icon wrapper', () => {
    const host = createHost()
    host.innerHTML = '<div id="show-hide-button"><yt-icon-button aria-label="Chat replay"><button disabled></button></yt-icon-button></div>'

    expect(collectArchiveChatControls()).toMatchObject({ native: null, replay: null, canOpen: false })
  })

  it('does not consider inherited disabled state an available chat control', () => {
    const host = createHost()
    host.innerHTML = '<fieldset disabled><div id="show-hide-button"><button aria-label="Chat replay"></button></div></fieldset>'

    expect(collectArchiveChatControls()).toMatchObject({ native: null, replay: null, canOpen: false })
  })

  it('does not toggle chat closed when revealing the player already opened it', () => {
    const host = createHost()
    const { player, button } = createPlayer(host)
    const click = vi.spyOn(button, 'click')
    const watch = document.createElement('ytd-watch-flexy')
    document.body.appendChild(watch)
    player.addEventListener('mouseover', () => {
      watch.setAttribute('live-chat-present-and-expanded', '')
      const iframe = document.createElement('iframe')
      iframe.id = 'chatframe'
      iframe.src = `https://www.youtube.com/live_chat_replay?v=${VIDEO_ID}`
      host.appendChild(iframe)
    }, { once: true })

    expect(openArchiveNativeChatPanel()).toBe(false)
    expect(click).not.toHaveBeenCalled()
  })

  it('does not operate a different video reached during player events', () => {
    const host = createHost()
    const { player, button } = createPlayer(host)
    const click = vi.spyOn(button, 'click')
    const mouseMove = vi.fn()
    player.addEventListener('mousemove', mouseMove)
    player.addEventListener('mouseover', () => {
      window.history.replaceState({}, '', '/watch?v=next-video')
      host.setAttribute('data-ylc-observed-video-id', 'next-video')
    }, { once: true })

    expect(openArchiveNativeChatPanel()).toBe(false)
    expect(click).not.toHaveBeenCalled()
    expect(mouseMove).not.toHaveBeenCalled()
  })

  it('uses a new sidebar control created by player events', () => {
    const host = createHost()
    const { player, button } = createPlayer(host)
    const oldClick = vi.spyOn(button, 'click')
    const sidebar = document.createElement('button')
    const newClick = vi.spyOn(sidebar, 'click')
    player.addEventListener('mouseover', () => {
      const slot = document.createElement('div')
      slot.id = 'show-hide-button'
      slot.appendChild(sidebar)
      host.appendChild(slot)
    }, { once: true })

    expect(openArchiveNativeChatPanel()).toBe(true)
    expect(oldClick).not.toHaveBeenCalled()
    expect(newClick).toHaveBeenCalledOnce()
  })
})
