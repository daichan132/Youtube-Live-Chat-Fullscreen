import { beforeEach, describe, expect, it } from 'vitest'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import {
  changeYLCBgColor,
  changeYLCBlur,
  changeYLCFontColor,
  changeYLCFontFamily,
  changeYLCMembershipNameColor,
  changeYLCStyle,
  getYLCStandardMembershipNameColor,
  resolveYLCMembershipNameColor,
  setYLCStyleProperties,
  setYLCStyleProperty,
} from './ylcStyleApplier'

const initialState = useYTDLiveChatNoLsStore.getState()

const createConnectedIframe = () => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  const doc = document.implementation.createHTMLDocument('')

  Object.defineProperty(iframe, 'contentDocument', {
    value: doc,
    configurable: true,
  })
  Object.defineProperty(iframe, 'isConnected', {
    value: true,
    configurable: true,
  })

  return { iframe, doc }
}

const createConnectedIframeWithThrowingDocument = () => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement

  Object.defineProperty(iframe, 'contentDocument', {
    configurable: true,
    get: () => {
      throw new Error('cross-origin')
    },
  })
  Object.defineProperty(iframe, 'isConnected', {
    value: true,
    configurable: true,
  })

  return iframe
}

beforeEach(() => {
  useYTDLiveChatNoLsStore.setState({ ...initialState }, true)
})

describe('ylcStyleApplier', () => {
  it('sets one or many CSS properties on the iframe document element', () => {
    const { iframe, doc } = createConnectedIframe()
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    setYLCStyleProperty('--test-color', 'red')
    setYLCStyleProperties([
      ['--test-size', '12px'],
      ['--test-spacing', '4px'],
    ])

    expect(doc.documentElement.style.getPropertyValue('--test-color')).toBe('red')
    expect(doc.documentElement.style.getPropertyValue('--test-size')).toBe('12px')
    expect(doc.documentElement.style.getPropertyValue('--test-spacing')).toBe('4px')
  })

  it('no-ops when iframe is missing or inaccessible', () => {
    expect(() => setYLCStyleProperty('--missing', 'value')).not.toThrow()

    useYTDLiveChatNoLsStore.setState({ iframeElement: createConnectedIframeWithThrowingDocument() })

    expect(() => setYLCStyleProperty('--cross-origin', 'value')).not.toThrow()
    expect(() => changeYLCBlur(12)).not.toThrow()
    expect(() => changeYLCFontFamily('Roboto')).not.toThrow()
  })

  it('keeps the public background transparent while darkening internal variables', () => {
    const { iframe, doc } = createConnectedIframe()
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    changeYLCBgColor({ r: 100, g: 120, b: 140, a: 0.8 })

    const style = doc.documentElement.style
    expect(style.getPropertyValue('--yt-live-chat-background-color')).toBe('transparent')
    expect(style.getPropertyValue('--yt-spec-icon-disabled')).toBe('rgba(60, 80, 100, 0.8)')
    expect(style.getPropertyValue('--yt-live-chat-vem-background-color')).toBe('rgba(80, 100, 120, 0.8)')
    expect(style.getPropertyValue('--extension-yt-live-menu-background-color')).toBe('rgba(100, 120, 140, 0.856)')
    expect(style.getPropertyValue('--extension-yt-live-panel-background-color')).toBe('rgba(100, 120, 140, 0.224)')
    expect(style.getPropertyValue('--yt-spec-menu-background')).toBe('rgba(100, 120, 140, 0.856)')
    expect(style.getPropertyValue('--yt-spec-raised-background')).toBe('rgba(100, 120, 140, 0.856)')
    expect(style.getPropertyValue('--yt-live-chat-header-background-color')).toBe('transparent')
    expect(style.getPropertyValue('--yt-spec-general-background-b')).toBe('transparent')
  })

  it('keeps menus readable while retaining a low-alpha tint for embedded panels', () => {
    const { iframe, doc } = createConnectedIframe()
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    changeYLCBgColor({ r: 0, g: 0, b: 0, a: 0.3 })

    const style = doc.documentElement.style
    expect(style.getPropertyValue('--extension-yt-live-menu-background-color')).toBe('rgba(0, 0, 0, 0.496)')
    expect(style.getPropertyValue('--extension-yt-live-panel-background-color')).toBe('rgba(0, 0, 0, 0.084)')

    changeYLCBgColor({ r: 0, g: 0, b: 0, a: 0 })

    expect(style.getPropertyValue('--extension-yt-live-menu-background-color')).toBe('rgba(0, 0, 0, 0.28)')
    expect(style.getPropertyValue('--extension-yt-live-panel-background-color')).toBe('rgba(0, 0, 0, 0)')
  })

  it('applies primary and secondary font colors with adjusted alpha', () => {
    const { iframe, doc } = createConnectedIframe()
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    changeYLCFontColor({ r: 10, g: 20, b: 30, a: 0.6 })

    const style = doc.documentElement.style
    expect(style.getPropertyValue('--extension-yt-live-font-color')).toBe('rgba(10, 20, 30, 0.6)')
    expect(style.getPropertyValue('--extension-yt-live-secondary-font-color')).toBe('rgba(10, 20, 30, 0.19999999999999996)')
    expect(style.getPropertyValue('--extension-yt-live-control-background-color')).toBe('rgba(10, 20, 30, 0.08)')
    expect(style.getPropertyValue('--extension-yt-live-menu-hover-background-color')).toBe('rgba(10, 20, 30, 0.08)')
    expect(style.getPropertyValue('--extension-yt-live-control-border-color')).toBe('rgba(10, 20, 30, 0.08)')
  })

  it('applies the membership name color', () => {
    const { iframe, doc } = createConnectedIframe()
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    changeYLCMembershipNameColor({ r: 12, g: 34, b: 56, a: 0.7 })

    const style = doc.documentElement.style
    expect(style.getPropertyValue('--extension-yt-live-membership-name-color')).toBe('rgba(12, 34, 56, 0.7)')
  })

  it('resolves the fallback membership color from YouTube sponsor color when available', () => {
    const { iframe, doc } = createConnectedIframe()
    doc.documentElement.style.setProperty('--yt-live-chat-sponsor-color', 'rgb(22, 163, 74)')
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    expect(getYLCStandardMembershipNameColor()).toEqual({ r: 22, g: 163, b: 74, a: 1 })
    expect(resolveYLCMembershipNameColor({ r: 15, g: 157, b: 88, a: 1 })).toEqual({ r: 22, g: 163, b: 74, a: 1 })

    changeYLCMembershipNameColor({ r: 15, g: 157, b: 88, a: 1 })

    expect(doc.documentElement.style.getPropertyValue('--extension-yt-live-membership-name-color')).toBe('rgba(22, 163, 74, 1)')
  })

  it('publishes blur for iframe surfaces while keeping body and host filters clear', () => {
    const { iframe } = createConnectedIframe()
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    changeYLCBlur(12)

    const body = iframe.contentDocument?.body as HTMLBodyElement
    expect(body.style.backdropFilter).toBe('none')
    expect(iframe.contentDocument?.documentElement.style.getPropertyValue('--extension-yt-live-backdrop-filter')).toBe('blur(12px)')
    expect(iframe.style.filter).toBe('none')
  })

  it('disables iframe body blur when the configured value is zero', () => {
    const { iframe } = createConnectedIframe()
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    changeYLCBlur(0)

    const body = iframe.contentDocument?.body as HTMLBodyElement
    expect(body.style.backdropFilter).toBe('none')
    expect(iframe.contentDocument?.documentElement.style.getPropertyValue('--extension-yt-live-backdrop-filter')).toBe('none')
  })

  it('imports, overwrites, removes, and normalizes custom fonts', () => {
    const { iframe, doc } = createConnectedIframe()
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    changeYLCFontFamily('Noto Sans')

    const styleElement = doc.head.querySelector('#custom-font-style') as HTMLStyleElement
    expect(styleElement).not.toBeNull()
    expect(styleElement.textContent).toBe("@import url('https://fonts.googleapis.com/css2?family=Noto+Sans&display=swap');")
    expect(doc.documentElement.style.getPropertyValue('font-family')).toBe('"Noto Sans", Roboto, Arial, sans-serif')

    changeYLCFontFamily('  roboto   slab ')

    const styleElements = doc.head.querySelectorAll('#custom-font-style')
    expect(styleElements).toHaveLength(1)
    expect(styleElements[0]?.textContent).toBe("@import url('https://fonts.googleapis.com/css2?family=Roboto+Slab&display=swap');")
    expect(doc.documentElement.style.getPropertyValue('font-family')).toBe('"Roboto Slab", Roboto, Arial, sans-serif')

    changeYLCFontFamily('NotInListFont')

    expect(doc.head.querySelector('#custom-font-style')).toBeNull()
    expect(doc.documentElement.style.getPropertyValue('font-family')).toBe('Roboto, Arial, sans-serif')
  })

  it('applies only the style update fields that are provided', () => {
    const { iframe, doc } = createConnectedIframe()
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    changeYLCStyle({
      bgColor: { r: 10, g: 20, b: 30, a: 0.9 },
      membershipNameColor: { r: 40, g: 50, b: 60, a: 1 },
      fontSize: 18,
      userNameDisplay: false,
      superChatBarDisplay: true,
    })

    const style = doc.documentElement.style
    expect(style.getPropertyValue('--yt-live-chat-background-color')).toBe('transparent')
    expect(style.getPropertyValue('--extension-yt-live-membership-name-color')).toBe('rgba(40, 50, 60, 1)')
    expect(style.getPropertyValue('--extension-yt-live-chat-font-size')).toBe('18px')
    expect(style.getPropertyValue('--extension-user-name-display')).toBe('none')
    expect(style.getPropertyValue('--extension-super-chat-bar-display')).toBe('block')
    expect(style.getPropertyValue('--extension-user-icon-display')).toBe('')
    expect(style.getPropertyValue('--extension-yt-live-font-color')).toBe('')
    expect(iframe.contentDocument?.body.style.backdropFilter).toBe('')
  })
})
