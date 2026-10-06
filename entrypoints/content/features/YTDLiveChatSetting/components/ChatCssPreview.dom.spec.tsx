import { act } from '@testing-library/react'
import { Provider } from 'jotai'
import { describe, expect, it } from 'vitest'
import { CHAT_CSS_PRESETS } from '@/shared/settings/chatCssPresets'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { chatSettingsStateAtom, EMPTY_MESSAGES, editorSessionStateAtom, localeStateAtom } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { ChatCssPreview } from './ChatCssPreview'
import { buildChatCssPreviewDocument } from './chatCssPreviewDocument'

const presetById = (id: string) => {
  const preset = CHAT_CSS_PRESETS.find(entry => entry.id === id)
  if (!preset) throw new Error(`Missing preview fixture preset: ${id}`)
  return preset
}
const messenger = presetById('messenger')
const stage = presetById('stage')

const parsePreview = (container: HTMLElement) => {
  const frame = container.querySelector('iframe')
  expect(frame).not.toBeNull()
  return new DOMParser().parseFromString(frame?.getAttribute('srcdoc') ?? '', 'text/html')
}

describe('packaged chat CSS previews', () => {
  it('runs the exact packaged source only in a network-disabled opaque sandbox', () => {
    const view = renderWithStore(<ChatCssPreview preset={messenger} />, createTestStore())
    const frame = view.container.querySelector('iframe')
    if (!frame) throw new Error('Missing preview iframe')
    expect(frame).toHaveAttribute('sandbox', '')
    expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(frame).not.toHaveAttribute('src')
    expect(view.container.querySelector('style, script, link, img')).toBeNull()
    const document = parsePreview(view.container)
    expect(document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
    )
    expect(document.querySelector('script, iframe, link, img, form, a')).toBeNull()
    expect(document.querySelector('style[data-ylc-css-preview-source="messenger"]')?.textContent).toBe(messenger.css)
    const baseStyles = document.querySelector('style[data-ylc-css-preview-base]')?.textContent
    expect(baseStyles).toContain('--extension-user-name-display')
    expect(baseStyles).toContain('var(--extension-yt-live-chat-font-size)')
    expect(baseStyles).toContain('#message.yt-live-chat-text-message-renderer')
    expect(document.querySelectorAll('#items > yt-live-chat-text-message-renderer')).toHaveLength(3)
    expect(document.querySelector('[data-preview-message="A"] > #content > yt-live-chat-author-chip > #author-name')).not.toBeNull()
    expect(document.querySelector('[data-preview-message="A"] > #content > #message')).not.toBeNull()
  })

  it('can omit repeated captions while keeping a labelled preview iframe', () => {
    const view = renderWithStore(<ChatCssPreview preset={messenger} caption='none' />, createTestStore())
    expect(view.container.querySelector('figcaption')).toBeNull()
    expect(view.container.querySelector('figure')).toHaveAttribute(
      'aria-label',
      'content.customCss.previewTitle · content.customCss.presetMessenger',
    )
    expect(view.container.querySelector('iframe')).toHaveAttribute(
      'title',
      'content.customCss.previewTitle · content.customCss.presetMessenger',
    )
    expect(parsePreview(view.container).querySelector('style[data-ylc-css-preview-source]')?.textContent).toBe(messenger.css)
  })

  it('reflects the current editing profile without saving or replacing the packaged CSS', () => {
    const store = createTestStore()
    const saved = store.get(chatSettingsStateAtom)
    const view = renderWithStore(<ChatCssPreview preset={messenger} />, store)
    const before = parsePreview(view.container)
    expect(before.documentElement.style.getPropertyValue('--extension-yt-live-chat-font-size')).toBe('13px')
    const profile = {
      ...saved.profile,
      appearance: {
        ...saved.profile.appearance,
        fontColor: { r: 12, g: 34, b: 56, a: 1 },
        backgroundColor: { r: 220, g: 230, b: 240, a: 0.8 },
        fontFamily: 'Noto Sans',
        fontSize: 40,
        spacing: 8,
        showUserName: false,
        showUserIcon: false,
      },
    }
    act(() => store.set(editorSessionStateAtom, { draftProfile: profile, past: [], future: [], activeGesture: null }))
    const after = parsePreview(view.container)
    expect(after.documentElement.style.getPropertyValue('--extension-yt-live-chat-font-size')).toBe('40px')
    expect(after.documentElement.style.getPropertyValue('--extension-yt-live-font-color')).toBe('rgba(12, 34, 56, 1)')
    expect(after.documentElement.style.getPropertyValue('--extension-yt-live-chat-spacing')).toBe('8px')
    expect(after.documentElement.style.getPropertyValue('--extension-user-name-display')).toBe('none')
    expect(after.documentElement.style.getPropertyValue('--extension-user-icon-display')).toBe('none')
    expect(after.documentElement.style.fontFamily).toContain('Noto Sans')
    expect(view.container.querySelector('.ylc-chat-css-preview-surface')).toHaveStyle({ backgroundColor: 'rgba(220, 230, 240, 0.8)' })
    expect(after.querySelector('style[data-ylc-css-preview-source]')?.textContent).toBe(messenger.css)
    expect(store.get(chatSettingsStateAtom)).toBe(saved)
  })

  it('updates direction, samples and preset from catalog metadata while keeping localized markup escaped', () => {
    const store = createTestStore()
    store.set(localeStateAtom, {
      code: 'ar',
      direction: 'rtl',
      messages: {
        ...EMPTY_MESSAGES,
        'content.customCss.previewTitle': 'معاينة',
        'content.customCss.presetStage': 'بطاقات',
        'content.customCss.exampleAuthorA': '</span><script>bad()</script>',
        'content.customCss.exampleMessageA': '<img src="https://example.invalid/tracking"> مرحبا',
      },
    })
    const view = renderWithStore(<ChatCssPreview preset={messenger} />, store)
    view.rerender(
      <Provider store={store}>
        <ChatCssPreview preset={{ ...stage, labelKey: 'content.customCss.warning' }} />
      </Provider>,
    )
    const document = parsePreview(view.container)
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(document.documentElement.getAttribute('lang')).toBe('ar')
    expect(view.container.querySelector('iframe')).toHaveAttribute('title', 'معاينة · بطاقات')
    expect(document.querySelector('#author-name')?.textContent).toBe('</span><script>bad()</script>')
    expect(document.querySelector('#message')?.textContent).toBe('<img src="https://example.invalid/tracking"> مرحبا')
    expect(document.querySelector('script, img')).toBeNull()
    expect(document.querySelector('style[data-ylc-css-preview-source]')?.textContent).toBe(stage.css)
  })

  it.each([
    undefined,
    { ...messenger, id: 'saved-style' },
    { ...messenger, css: '</style><script>bad()</script>@import url(https://example.invalid/tracking)' },
  ])('never mounts a preview for an absent, saved or changed source', preset => {
    const view = renderWithStore(<ChatCssPreview preset={preset} />, createTestStore())
    expect(view.container.querySelector('iframe, style, script')).toBeNull()
    expect(view.container.textContent).toBe('')
  })

  it('escapes profile font names and sample attributes at the srcDoc HTML boundary', () => {
    const hostile = '</style><script>bad()</script><iframe src="https://example.invalid/">'
    const documentSource = buildChatCssPreviewDocument({
      preset: messenger,
      profile: { ...DEFAULT_CHAT_PROFILE, appearance: { ...DEFAULT_CHAT_PROFILE.appearance, fontFamily: hostile } },
      direction: 'ltr',
      language: '" onload="bad()',
      title: hostile,
      messages: [{ id: '" onclick="bad()', initial: hostile, author: hostile, message: hostile }],
    })
    if (!documentSource) throw new Error('Missing trusted preview source')
    const document = new DOMParser().parseFromString(documentSource, 'text/html')
    expect(document.querySelector('script, iframe, [onload], [onclick]')).toBeNull()
    expect(document.querySelectorAll('style')).toHaveLength(2)
    expect(document.querySelector('#message')?.textContent).toBe(hostile)
    expect(document.querySelector('title')?.textContent).toBe(hostile)
    expect(document.querySelector('style[data-ylc-css-preview-source]')?.textContent).toBe(messenger.css)
  })
})
