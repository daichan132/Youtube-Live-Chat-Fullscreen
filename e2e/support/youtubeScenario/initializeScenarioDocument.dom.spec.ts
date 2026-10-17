import { afterEach, describe, expect, it, vi } from 'vitest'
import { type CompiledYouTubeScenario, compileYouTubeScenario } from './compiler'
import { initializeScenarioDocument } from './initializeScenarioDocument'
import type { YouTubeScenarioState } from './types'

type InitializationPath = 'compiled HTML' | 'SPA initializer'
type FixturePlayer = HTMLElement & { getVideoData: () => { isLive: boolean; isLiveContent: boolean; video_id: string } }

const originalFullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
const originalExitFullscreen = Object.getOwnPropertyDescriptor(document, 'exitFullscreen')

afterEach(() => {
  document.body.replaceChildren()
  for (const [name, descriptor] of [
    ['fullscreenElement', originalFullscreenElement],
    ['exitFullscreen', originalExitFullscreen],
  ] as const) {
    if (descriptor) Object.defineProperty(document, name, descriptor)
    else Reflect.deleteProperty(document, name)
  }
})

const scenarioFor = (mode: 'live' | 'archive'): YouTubeScenarioState => {
  const shared = {
    page: { chatContainer: 'present' as const },
    fullscreen: false,
  }
  return mode === 'live'
    ? {
        ...shared,
        video: { id: 'fixture-live', title: 'Live fixture', mode: 'live' },
        chat: { mode: 'live', native: { state: 'absent' }, response: 'playable' },
      }
    : {
        ...shared,
        video: { id: 'fixture-archive', title: 'Archive fixture', mode: 'archive' },
        chat: { mode: 'archive', native: { state: 'absent' }, response: 'playable' },
      }
}

const installDocument = (compiled: CompiledYouTubeScenario) => {
  const parsed = new DOMParser().parseFromString(compiled.watchHtml, 'text/html')
  document.body.innerHTML = parsed.body.innerHTML
}

const initialize = (path: InitializationPath, compiled: CompiledYouTubeScenario) => {
  if (path === 'compiled HTML') {
    // innerHTML does not execute scripts. Execute the actual emitted scripts
    // independently of the module scope to prove the HTML is self-contained.
    for (const script of document.scripts) new Function(script.textContent ?? '')()
  } else {
    initializeScenarioDocument({ ...compiled.spaDocument, generation: 4 })
  }
}

describe.each(['compiled HTML', 'SPA initializer'] as const)('scenario document through %s', path => {
  it.each(['live', 'archive'] as const)('initializes %s metadata, fullscreen controls, and the boundary counter', async mode => {
    const state = scenarioFor(mode)
    const compiled = compileYouTubeScenario(state)
    installDocument(compiled)
    const player = document.getElementById('movie_player') as FixturePlayer
    const fullscreenButton = document.querySelector<HTMLButtonElement>('.ytp-fullscreen-button')
    const boundary = document.querySelector<HTMLButtonElement>('[data-ylc-player-boundary-probe]')
    if (!player || !fullscreenButton || !boundary) throw new Error('Missing compiled player controls')

    let fullscreenElement: Element | null = null
    const requestFullscreen = vi.fn(async () => {
      fullscreenElement = player
    })
    const exitFullscreen = vi.fn(async () => {
      fullscreenElement = null
    })
    Object.defineProperties(document, {
      fullscreenElement: { configurable: true, get: () => fullscreenElement },
      exitFullscreen: { configurable: true, value: exitFullscreen },
    })
    Object.assign(player, { requestFullscreen })

    initialize(path, compiled)
    expect(player.getVideoData()).toEqual({
      isLive: mode === 'live',
      isLiveContent: mode === 'live',
      video_id: state.video.id,
    })
    expect(player.dataset.ylcFixtureGeneration).toBe(path === 'compiled HTML' ? '0' : '4')

    boundary.click()
    boundary.click()
    expect(boundary.dataset.ylcClicks).toBe('2')

    fullscreenButton.click()
    await Promise.resolve()
    expect(document.fullscreenElement).toBe(player)
    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(exitFullscreen).not.toHaveBeenCalled()
    fullscreenButton.click()
    await Promise.resolve()
    expect(document.fullscreenElement).toBeNull()
    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(exitFullscreen).toHaveBeenCalledOnce()
  })

  it('navigates a native browsing context without assigning an iframe src', () => {
    const compiled = compileYouTubeScenario({
      ...scenarioFor('live'),
      video: { id: 'current-video', title: 'Native context fixture', mode: 'live' },
      chat: {
        mode: 'live',
        native: { state: 'playable', continuationVideoId: 'previous-video', navigateWithoutSrc: true },
        response: 'playable',
      },
    })
    installDocument(compiled)
    const iframe = document.querySelector<HTMLIFrameElement>('ytd-live-chat-frame > #chatframe')
    if (!iframe) throw new Error('Missing compiled native iframe')
    const assign = vi.fn()
    Object.defineProperty(iframe, 'contentWindow', { configurable: true, value: { location: { assign } } })

    initialize(path, compiled)
    expect(assign).toHaveBeenCalledExactlyOnceWith('/live_chat?continuation=ylc-fixture-previous-video')
    expect(iframe.hasAttribute('src')).toBe(false)
  })
})
