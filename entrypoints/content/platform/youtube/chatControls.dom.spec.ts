import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openArchiveNativeChatPanel } from '../../utils/nativeChat'
import { collectArchiveChatControls, isChatControl } from './chatControls'

const VIDEO_ID = 'current-video'

const createHost = (videoId = VIDEO_ID) => {
  const host = document.createElement('ytd-live-chat-frame')
  host.setAttribute('data-ylc-observed-video-id', videoId)
  document.body.appendChild(host)
  return host
}

const sidebarButton = (host: HTMLElement, label: string) => {
  const slot = document.createElement('div')
  slot.id = 'show-hide-button'
  const button = document.createElement('button')
  button.setAttribute('aria-label', label)
  slot.appendChild(button)
  host.appendChild(slot)
  return button
}

const playerButton = (label: string) => {
  const player = document.createElement('div')
  player.id = 'movie_player'
  const controls = document.createElement('div')
  controls.className = 'ytp-right-controls'
  const model = document.createElement('toggle-button-view-model')
  const button = document.createElement('button')
  button.setAttribute('aria-pressed', 'false')
  button.setAttribute('aria-label', label)
  model.appendChild(button)
  controls.appendChild(model)
  player.appendChild(controls)
  document.body.appendChild(player)
  return { player, model, button }
}

const giveLayoutBox = (element: HTMLElement) => {
  const rect = new DOMRect(0, 0, 20, 20)
  const rects = Object.assign([rect], { item: (index: number) => (index === 0 ? rect : null) })
  vi.spyOn(element, 'getClientRects').mockReturnValue(rects)
}

beforeEach(() => {
  document.body.replaceChildren()
  window.history.replaceState({}, '', `/watch?v=${VIDEO_ID}`)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

describe('YouTube archive control observation', () => {
  it('prefers a laid-out control and carries provenance without losing separate replay evidence', () => {
    const host = createHost()
    const replay = sidebarButton(host, 'Show chat replay')
    const visible = sidebarButton(host, 'Show chat')
    giveLayoutBox(visible)

    const result = collectArchiveChatControls()

    expect(result.native?.element).toBe(visible)
    expect(result.native?.visible).toBe(true)
    expect(result.native?.probeId).toBe('chat.archive.sidebar.v1.1')
    expect(result.replay?.element).toBe(replay)
    expect(result.replay?.visible).toBe(false)
  })

  it('recognizes a structurally linked localized control without English or Japanese labels', () => {
    const host = createHost()
    host.id = 'current-chat'
    const { button } = playerButton('显示实时聊天')
    button.setAttribute('aria-controls', host.id)

    expect(collectArchiveChatControls().native?.element).toBe(button)
  })

  it('does not use disabled or stale-video controls as replay evidence', () => {
    const stale = createHost('previous-video')
    sidebarButton(stale, 'Show chat replay')
    const current = createHost()
    sidebarButton(current, 'Show chat replay').disabled = true
    sidebarButton(current, 'Show chat replay').setAttribute('aria-disabled', 'true')

    expect(collectArchiveChatControls()).toMatchObject({ native: null, replay: null, canOpen: false })
  })

  it('re-observes the control replaced by revealing the player before clicking', () => {
    createHost()
    const { player, model, button } = playerButton('Live chat')
    const replacement = button.cloneNode(true) as HTMLButtonElement
    const oldClick = vi.spyOn(button, 'click')
    const newClick = vi.spyOn(replacement, 'click')
    player.addEventListener('mouseover', () => model.replaceChildren(replacement), { once: true })

    expect(openArchiveNativeChatPanel()).toBe(true)
    expect(oldClick).not.toHaveBeenCalled()
    expect(newClick).toHaveBeenCalledOnce()
  })

  it('retains replay labels on the icon wrapper while clicking its inner button', () => {
    const host = createHost()
    host.innerHTML = '<div id="show-hide-button"><yt-icon-button aria-label="Show chat replay"><button></button></yt-icon-button></div>'
    const button = host.querySelector('button')!
    const click = vi.spyOn(button, 'click')

    expect(isChatControl(button)).toBe(true)
    expect(collectArchiveChatControls().replay?.element).toBe(button)
    expect(openArchiveNativeChatPanel()).toBe(true)
    expect(click).toHaveBeenCalledOnce()
  })

  it('honors explicit relationships on the wrapper instead of its familiar label', () => {
    const stale = createHost('previous-video')
    stale.id = 'stale-chat'
    createHost()
    const { button } = playerButton('')
    const wrapper = document.createElement('yt-icon-button')
    wrapper.setAttribute('aria-controls', stale.id)
    wrapper.setAttribute('aria-label', 'Chat replay')
    button.replaceWith(wrapper)
    wrapper.appendChild(button)

    expect(isChatControl(button)).toBe(false)
    expect(collectArchiveChatControls()).toMatchObject({ native: null, replay: null, canOpen: false })
  })
})
