import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSettingScrollContainer, revealElementsInSettingPanel, scrollSettingPanelRangeIntoView } from './useEnsureSettingPanelVisibility'

const toRect = (top: number, bottom: number): DOMRect =>
  ({
    x: 0,
    y: top,
    top,
    bottom,
    left: 0,
    right: 0,
    width: 0,
    height: bottom - top,
    toJSON: () => ({}),
  }) as DOMRect

const setRect = (element: HTMLElement, top: number, bottom: number) => {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(toRect(top, bottom))
}

const mockSmoothScrollTo = (element: HTMLElement) => {
  const scrollToMock = vi.fn((options: ScrollToOptions) => {
    if (typeof options.top === 'number') {
      element.scrollTop = options.top
    }
  })
  Object.defineProperty(element, 'scrollTo', {
    value: scrollToMock,
    configurable: true,
    writable: true,
  })
  return scrollToMock
}

describe('useEnsureSettingPanelVisibility helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('finds scroll container from closest ancestor', () => {
    const container = document.createElement('div')
    container.setAttribute('data-ylc-setting-scroll-container', 'true')
    const child = document.createElement('button')
    container.appendChild(child)
    document.body.appendChild(container)

    expect(getSettingScrollContainer(child)).toBe(container)
  })

  it('finds scroll container via shadow root fallback', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const container = document.createElement('div')
    container.setAttribute('data-ylc-setting-scroll-container', 'true')
    const anchor = document.createElement('button')

    shadowRoot.appendChild(container)
    shadowRoot.appendChild(anchor)

    expect(getSettingScrollContainer(anchor)).toBe(container)
  })

  it('scrolls down when popup bottom is outside container viewport', () => {
    const container = document.createElement('div')
    const anchor = document.createElement('button')
    const popup = document.createElement('div')
    const scrollToMock = mockSmoothScrollTo(container)
    container.setAttribute('data-ylc-setting-scroll-container', 'true')
    container.append(anchor, popup)
    document.body.appendChild(container)
    container.scrollTop = 10

    setRect(container, 100, 300)
    setRect(anchor, 252, 280)
    setRect(popup, 280, 420)

    const changed = revealElementsInSettingPanel(anchor, popup, 8)

    expect(changed).toBe(true)
    expect(scrollToMock).toHaveBeenCalledWith({ top: 138, behavior: 'smooth' })
    expect(container.scrollTop).toBe(138)
  })

  it('scrolls up when target top is outside container viewport', () => {
    const container = document.createElement('div')
    const scrollToMock = mockSmoothScrollTo(container)
    container.scrollTop = 40
    setRect(container, 100, 300)

    const changed = scrollSettingPanelRangeIntoView(container, { top: 70, bottom: 140 }, 8)

    expect(changed).toBe(true)
    expect(scrollToMock).toHaveBeenCalledWith({ top: 2, behavior: 'smooth' })
    expect(container.scrollTop).toBe(2)
  })

  it('does not scroll when target is already fully visible', () => {
    const container = document.createElement('div')
    container.scrollTop = 40
    setRect(container, 100, 300)

    const changed = scrollSettingPanelRangeIntoView(container, { top: 120, bottom: 180 }, 8)

    expect(changed).toBe(false)
    expect(container.scrollTop).toBe(40)
  })
})
