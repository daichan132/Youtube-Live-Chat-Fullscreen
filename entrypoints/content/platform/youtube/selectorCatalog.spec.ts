import { describe, expect, it } from 'vitest'
import { queryAllProbes, queryFirstProbe, youtubeSelectorCatalog } from './selectorCatalog'

describe('youtubeSelectorCatalog', () => {
  it('keeps probe ids unique and selectors non-empty', () => {
    const probes = Object.values(youtubeSelectorCatalog)
    const probeIds = probes.map(probe => probe.probeId)

    expect(new Set(probeIds).size).toBe(probeIds.length)
    expect(probes.every(probe => probe.selectors.every(selector => selector.trim().length > 0))).toBe(true)
  })

  it('reports the fallback probe that actually matched', () => {
    const root = document.createElement('div')
    root.innerHTML = '<ytd-live-chat-frame><iframe class="ytd-live-chat-frame"></iframe></ytd-live-chat-frame>'

    const result = queryFirstProbe<HTMLIFrameElement>(root, youtubeSelectorCatalog.nativeChatIframe)

    expect(result.probeId).toBe('chat.iframe.v2.2')
    expect(result.element).toBeInstanceOf(HTMLIFrameElement)
  })

  it('deduplicates elements found by multiple selector candidates', () => {
    const root = document.createElement('div')
    root.innerHTML = '<ytd-live-chat-frame><iframe id="chatframe" class="ytd-live-chat-frame"></iframe></ytd-live-chat-frame>'

    const result = queryAllProbes<HTMLIFrameElement>(root, youtubeSelectorCatalog.nativeChatIframe)

    expect(result.elements).toHaveLength(1)
    expect(result.probeIds).toEqual(['chat.iframe.v2.1', 'chat.iframe.v2.2'])
  })
})
