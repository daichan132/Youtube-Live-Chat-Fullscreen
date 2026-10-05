import { act } from '@testing-library/react'
import { Provider } from 'jotai'
import { describe, expect, it } from 'vitest'
import { CHAT_CSS_PRESETS } from '@/shared/settings/chatCssPresets'
import { EMPTY_MESSAGES, localeStateAtom } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { ChatCssExample } from './ChatCssExample'

const presetById = (id: string) => {
  const preset = CHAT_CSS_PRESETS.find(entry => entry.id === id)
  if (!preset) throw new Error(`Missing fixture preset: ${id}`)
  return preset
}

const translatedMessages = {
  ...EMPTY_MESSAGES,
  'content.customCss.exampleAuthorA': 'はるか',
  'content.customCss.exampleAuthorB': 'ゆう',
  'content.customCss.exampleAuthorC': 'あおい',
  'content.customCss.exampleMessageA': 'こんばんは！ 👋',
  'content.customCss.exampleMessageB': 'このシーン、とても好きです。みんなと一緒に見られてうれしい！',
  'content.customCss.exampleMessageC': 'すごい！ 👏',
}

const expectNoExecutableContent = (container: HTMLElement) => {
  expect(container.querySelector('style, script, iframe, link, img')).toBeNull()
  expect(container.querySelector('[style]')).toBeNull()
}

describe('fixed chat CSS illustrations', () => {
  it.each(CHAT_CSS_PRESETS)('illustrates $id with named authors, avatars and short/long chat text', preset => {
    const store = createTestStore()
    store.set(localeStateAtom, { code: 'ja', direction: 'ltr', messages: translatedMessages })
    const view = renderWithStore(<ChatCssExample preset={preset} />, store)
    expect(view.getByText(preset.descriptionKey)).toBeVisible()
    expect(view.queryByText('content.customCss.presetHelp')).toBeNull()
    const rows = view.container.querySelectorAll('.ylc-css-example-message')
    expect(rows).toHaveLength(3)
    expect([...rows].map(row => row.querySelector('.ylc-css-example-avatar')?.textContent)).toEqual(['H', 'Y', 'A'])
    expect([...rows].map(row => row.querySelector('.ylc-css-example-author')?.textContent)).toEqual(['はるか', 'ゆう', 'あおい'])
    expect([...rows].map(row => row.querySelector('.ylc-css-example-line')?.textContent)).toEqual([
      'こんばんは！ 👋',
      'このシーン、とても好きです。みんなと一緒に見られてうれしい！',
      'すごい！ 👏',
    ])
    expect(view.container.querySelector('.ylc-css-example-messages')).toHaveAttribute('aria-hidden', 'true')
    expectNoExecutableContent(view.container)
  })

  it('selects the three layout illustrations independently while using translated sample text', () => {
    const store = createTestStore()
    store.set(localeStateAtom, { code: 'ja', direction: 'ltr', messages: translatedMessages })
    const view = renderWithStore(<ChatCssExample preset={presetById('messenger')} />, store)
    for (const id of ['messenger', 'stage', 'timeline']) {
      view.rerender(
        <Provider store={store}>
          <ChatCssExample preset={presetById(id)} />
        </Provider>,
      )
      expect(view.container.querySelector('figure')).toHaveAttribute('data-ylc-css-example', id)
      expect(view.container.querySelectorAll('.ylc-css-example-message')).toHaveLength(3)
      expectNoExecutableContent(view.container)
    }
    act(() => {
      store.set(localeStateAtom, {
        code: 'en',
        direction: 'ltr',
        messages: { ...translatedMessages, 'content.customCss.exampleMessageC': 'Amazing! 👏' },
      })
    })
    expect(view.getByText('Amazing! 👏')).toBeVisible()
    expect(view.container.querySelector('figure')).toHaveAttribute('data-ylc-css-example', 'timeline')
  })

  it('keeps unknown and modified sources neutral, including a forged packaged ID', () => {
    const preset = presetById('messenger')
    const unsafeCss = '</style><script>unsafe()</script>@import url(https://example.invalid/style.css);'
    for (const untrusted of [
      { ...preset, css: unsafeCss },
      { ...preset, id: 'saved-user-style' },
    ]) {
      const view = renderWithStore(<ChatCssExample preset={untrusted} />, createTestStore())
      expect(view.container.querySelector('figure')).toHaveAttribute('data-ylc-css-example', 'custom')
      expect(view.container.querySelector('.ylc-css-example-messages')).toBeNull()
      expect(view.getByText('content.customCss.warning')).toBeVisible()
      expect(view.container.textContent).not.toContain(unsafeCss)
      expectNoExecutableContent(view.container)
      view.unmount()
    }
  })

  it('uses catalog metadata for an exact source rather than caller-provided descriptions', () => {
    const preset = presetById('stage')
    const view = renderWithStore(<ChatCssExample preset={{ ...preset, descriptionKey: 'content.customCss.warning' }} />, createTestStore())
    expect(view.getByText(preset.descriptionKey)).toBeVisible()
    expect(view.queryByText('content.customCss.warning')).toBeNull()
    expectNoExecutableContent(view.container)
  })

  it('shows a neutral illustration when no packaged source is selected', () => {
    const view = renderWithStore(<ChatCssExample />, createTestStore())
    expect(view.container.querySelector('figure')).toHaveAttribute('data-ylc-css-example', 'custom')
    expect(view.container.querySelector('.ylc-css-example-messages')).toBeNull()
    expect(view.getByText('content.customCss.warning')).toBeVisible()
    expectNoExecutableContent(view.container)
  })
})
