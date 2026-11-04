import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IFRAME_STYLE_MARKER_ATTR } from '../constants/styleContract'
import { ensureNativeChatStylesReady, ensureStyleInjected } from './iframeInitializer'

const createChatDoc = () => document.implementation.createHTMLDocument('chat') as Document

describe('iframeInitializer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('injects iframe styles once', () => {
    const doc = createChatDoc()

    expect(ensureStyleInjected(doc, 'body { color: red; }')).toBe(true)
    expect(ensureStyleInjected(doc, 'body { color: blue; }')).toBe(false)
    expect(doc.head?.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)).not.toBeNull()
    expect(doc.head?.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)?.textContent).toBe('body { color: red; }')
  })

  const nativeCss = (rules: CSSRule[] | null, readyState = 'complete') => {
    const iframe = document.createElement('iframe')
    iframe.src = '/live_chat?v=fixture'
    document.body.append(iframe)
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Missing native chat fixture document')
    doc.open()
    doc.write('<!doctype html><html><head></head><body></body></html>')
    doc.close()
    Object.defineProperty(doc, 'readyState', { configurable: true, get: () => readyState })
    const link = doc.createElement('link')
    link.id = 'base-css'
    link.rel = 'stylesheet'
    link.href = '/s/desktop/fixture/cssbin/chat.css'
    doc.head.append(link)
    Object.defineProperty(link, 'sheet', { configurable: true, value: rules === null ? null : { cssRules: rules } })
    return { doc, link }
  }

  it('does not expose a complete chat document with empty base CSS and retries its exact URL only once', () => {
    const rules: CSSRule[] = []
    const { doc, link } = nativeCss(rules)
    const retried = new WeakSet<HTMLLinkElement>()
    const href = link.getAttribute('href')
    const remove = vi.spyOn(link, 'removeAttribute')
    const set = vi.spyOn(link, 'setAttribute')
    expect(ensureNativeChatStylesReady(doc, retried)).toBe(false)
    for (let i = 0; i < 12; i++) expect(ensureNativeChatStylesReady(doc, retried)).toBe(false)
    expect(remove).not.toHaveBeenCalled()
    expect(set).toHaveBeenCalledExactlyOnceWith('href', `${href}#ylc-css-retry`)
    expect(new URL(link.href).pathname).toBe(new URL(href ?? '', doc.baseURI).pathname)
    expect(new URL(link.href).search).toBe(new URL(href ?? '', doc.baseURI).search)
    expect(doc.getElementById('base-css')).toBe(link)
    rules.push({} as CSSRule)
    expect(ensureNativeChatStylesReady(doc, retried)).toBe(true)
    expect(set).toHaveBeenCalledTimes(1)
  })

  it('waits for pending CSS without restarting it, then retries a completed failed load', () => {
    const { doc, link } = nativeCss(null, 'loading')
    const retried = new WeakSet<HTMLLinkElement>()
    const set = vi.spyOn(link, 'setAttribute')
    expect(ensureNativeChatStylesReady(doc, retried)).toBe(false)
    expect(set).not.toHaveBeenCalled()
    Object.defineProperty(doc, 'readyState', { value: 'complete' })
    expect(ensureNativeChatStylesReady(doc, retried)).toBe(false)
    expect(set).toHaveBeenCalledOnce()
  })

  it('leaves usable, disabled and unreadable native stylesheets alone', () => {
    const { doc, link } = nativeCss([{} as CSSRule])
    const retried = new WeakSet<HTMLLinkElement>()
    const href = link.href
    expect(ensureNativeChatStylesReady(doc, retried)).toBe(true)
    Object.defineProperty(link, 'sheet', {
      value: {
        get cssRules() {
          throw new DOMException('Blocked', 'SecurityError')
        },
      },
    })
    expect(ensureNativeChatStylesReady(doc, retried)).toBe(true)
    link.disabled = true
    expect(ensureNativeChatStylesReady(doc, retried)).toBe(true)
    expect(link.href).toBe(href)
    expect(doc.getElementById('base-css')).toBe(link)
  })

  it('does not re-request cross-origin or malformed URLs and supports chat without a base link', () => {
    const { doc, link } = nativeCss([])
    link.href = 'https://static.example.test/base.css'
    expect(ensureNativeChatStylesReady(doc, new WeakSet())).toBe(false)
    expect(link.href).toBe('https://static.example.test/base.css')
    link.href = 'https://['
    expect(ensureNativeChatStylesReady(doc, new WeakSet())).toBe(false)
    expect(link.getAttribute('href')).toBe('https://[')
    link.remove()
    expect(ensureNativeChatStylesReady(doc, new WeakSet())).toBe(true)
  })
})
