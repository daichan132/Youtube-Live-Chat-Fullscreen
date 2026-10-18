import type { Page } from '@playwright/test'
import { afterEach, describe, expect, it } from 'vitest'
import { closeNativeChat } from './nativeChat'

type VisibilityFailure = { scope: 'outer' | 'inner'; error: Error }

const createPage = (failure?: VisibilityFailure) => {
  const locator = (getRoot: () => ParentNode | null, selector: string, scope: VisibilityFailure['scope']) => ({
    first() {
      return this
    },
    async isVisible() {
      if (failure?.scope === scope) throw failure.error
      const element = getRoot()?.querySelector<HTMLElement>(selector)
      if (!element || element.hidden) return false
      const style = getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden'
    },
    async click() {
      const element = getRoot()?.querySelector<HTMLElement>(selector)
      if (!element) throw new Error('Native close target disappeared.')
      element.click()
    },
  })
  return {
    locator: (selector: string) => locator(() => document, selector, 'outer'),
    frameLocator: (selector: string) => ({
      locator: (innerSelector: string) =>
        locator(() => document.querySelector<HTMLIFrameElement>(selector)?.contentDocument ?? null, innerSelector, 'inner'),
    }),
  } as unknown as Page
}

const mountNativeChat = (control: 'outer' | 'inner' | 'absent') => {
  const host = document.createElement('ytd-live-chat-frame')
  const iframe = document.createElement('iframe')
  iframe.id = 'chatframe'
  host.append(iframe)
  document.body.append(host)
  const chatDocument = iframe.contentDocument
  if (!chatDocument) throw new Error('The native chat document is missing.')
  if (control === 'absent') return host
  const target = control === 'inner' ? chatDocument.body : host
  target.insertAdjacentHTML(
    'afterbegin',
    control === 'inner'
      ? '<yt-live-chat-header-renderer><div id="close-button"><button>Hide chat</button></div></yt-live-chat-header-renderer>'
      : '<div id="show-hide-button"><button>Hide chat</button></div>',
  )
  const button = target.querySelector('button')
  if (!button) throw new Error('The native close control is missing.')
  button.addEventListener('click', () => {
    host.setAttribute('collapsed', '')
    host.setAttribute('hidden', '')
  })
  return host
}

afterEach(() => document.body.replaceChildren())

describe('native chat close precondition', () => {
  it.each(['outer', 'inner'] as const)('closes the native panel through its %s control', async control => {
    const host = mountNativeChat(control)
    expect(host).not.toHaveAttribute('collapsed')

    await expect(closeNativeChat(createPage())).resolves.toBe(true)

    expect(host).toHaveAttribute('collapsed')
    expect(host).toHaveAttribute('hidden')
  })

  it('reports unavailable controls without closing the native panel', async () => {
    const host = mountNativeChat('absent')

    await expect(closeNativeChat(createPage())).resolves.toBe(false)

    expect(host).not.toHaveAttribute('collapsed')
    expect(host).not.toHaveAttribute('hidden')
  })

  it.each([
    ['outer', new Error('Browser connection closed')],
    ['inner', new TypeError('Broken inner visibility helper')],
  ] as const)('propagates an unexpected %s visibility error', async (scope, error) => {
    const host = mountNativeChat(scope)

    await expect(closeNativeChat(createPage({ scope, error }))).rejects.toBe(error)

    expect(host).not.toHaveAttribute('collapsed')
    expect(host).not.toHaveAttribute('hidden')
  })
})
