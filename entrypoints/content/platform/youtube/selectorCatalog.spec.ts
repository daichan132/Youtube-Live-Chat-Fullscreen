import { describe, expect, it } from 'vitest'
import {
  closestProbe,
  identifyProbeForElement,
  matchesProbe,
  queryAllProbes,
  queryFirstProbe,
  runtimeBoundarySelector,
  youtubeSelectorCatalog,
} from './selectorCatalog'

describe('youtubeSelectorCatalog', () => {
  it('keeps probe ids unique and selectors non-empty', () => {
    const probes = Object.values(youtubeSelectorCatalog)
    const probeIds = probes.map(probe => probe.probeId)

    expect(new Set(probeIds).size).toBe(probeIds.length)
    for (const probe of probes) {
      expect(probe.selectors.length, probe.probeId).toBeGreaterThan(0)
      for (const selector of probe.selectors) {
        expect(selector.trim(), probe.probeId).not.toBe('')
        expect(() => document.querySelector(selector), `${probe.probeId}: ${selector}`).not.toThrow()
      }
    }
  })

  it('reports the fallback probe that actually matched', () => {
    const root = document.createElement('div')
    root.innerHTML = '<ytd-live-chat-frame><iframe class="ytd-live-chat-frame"></iframe></ytd-live-chat-frame>'

    const result = queryFirstProbe<HTMLIFrameElement>(root, youtubeSelectorCatalog.nativeChatIframe)

    expect(result.probeId).toBe('chat.iframe.v2.2')
    expect(result.element).toBeInstanceOf(HTMLIFrameElement)
  })

  it('matches a resolved element through the shared probe candidates', () => {
    const root = document.createElement('div')
    root.innerHTML = '<ytd-live-chat-frame><iframe class="ytd-live-chat-frame"></iframe></ytd-live-chat-frame>'
    const iframe = root.querySelector('iframe')

    expect(iframe && matchesProbe(iframe, youtubeSelectorCatalog.nativeChatIframe)).toBe(true)
  })

  it('deduplicates elements found by multiple selector candidates', () => {
    const root = document.createElement('div')
    root.innerHTML = '<ytd-live-chat-frame><iframe id="chatframe" class="ytd-live-chat-frame"></iframe></ytd-live-chat-frame>'

    const result = queryAllProbes<HTMLIFrameElement>(root, youtubeSelectorCatalog.nativeChatIframe)

    expect(result.elements).toHaveLength(1)
    expect(result.probeIds).toEqual(['chat.iframe.v2.1', 'chat.iframe.v2.2'])
  })

  it('finds the nearest ancestor across selector variants without preferring a farther primary match', () => {
    const root = document.createElement('div')
    root.innerHTML = '<div class="primary"><section class="fallback"><button></button></section></div>'
    const button = root.querySelector('button')
    if (!button) throw new Error('Missing control')

    const probe = { probeId: 'host.v1', selectors: ['.primary', '.fallback'] }
    expect(closestProbe(button, probe)).toBe(root.querySelector('.fallback'))
    expect(closestProbe(button, { probeId: 'absent.v1', selectors: ['.absent'] })).toBeNull()
  })

  it('identifies the exact fallback selector that contains a resolved control', () => {
    const root = document.createElement('div')
    root.innerHTML = '<div class="fallback"><button>Open</button></div>'

    expect(
      identifyProbeForElement(root, { probeId: 'control.v1', selectors: ['.missing', '.fallback'] }, root.querySelector('button')),
    ).toBe('control.v1.2')
  })

  it('keeps live UI nodes inside the runtime boundary after their active class is removed', () => {
    const timeDisplay = document.createElement('div')
    timeDisplay.className = 'ytp-time-display ytp-live'
    const liveBadge = document.createElement('div')
    liveBadge.className = 'ytp-live-badge ytp-live-badge-is-livehead'

    expect(timeDisplay.matches(runtimeBoundarySelector)).toBe(true)
    expect(liveBadge.matches(runtimeBoundarySelector)).toBe(true)

    timeDisplay.classList.remove('ytp-live')
    liveBadge.classList.remove('ytp-live-badge-is-livehead')

    expect(timeDisplay.matches(runtimeBoundarySelector)).toBe(true)
    expect(liveBadge.matches(runtimeBoundarySelector)).toBe(true)
  })
})
