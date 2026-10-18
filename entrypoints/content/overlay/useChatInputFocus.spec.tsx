import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatInputFocus } from './useChatInputFocus'

const required = <T,>(value: T | null) => {
  if (!value) throw new Error('The local focus fixture is incomplete.')
  return value
}

const createChat = (carrier: HTMLElement) => {
  const iframe = document.createElement('iframe')
  carrier.append(iframe)
  const chat = required(iframe.contentDocument)
  chat.body.innerHTML =
    '<div contenteditable="true" tabindex="0"><span>Unsent draft</span></div><input><textarea></textarea><button>Emoji</button>'
  const hasFocus = vi.spyOn(chat, 'hasFocus').mockReturnValue(true)
  return {
    iframe,
    chat,
    hasFocus,
    editable: required(chat.querySelector<HTMLElement>('[contenteditable]')),
    input: required(chat.querySelector('input')),
  }
}
const settleMutation = async () =>
  act(async () => {
    await Promise.resolve()
  })

describe('useChatInputFocus', () => {
  let carrier: HTMLDivElement
  beforeEach(() => {
    carrier = document.createElement('div')
    document.body.append(carrier)
    vi.useFakeTimers()
  })
  afterEach(() => {
    carrier.remove()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('holds visibility for native contenteditable, input and textarea focus, then releases for a normal button', () => {
    const { chat, editable, input } = createChat(carrier)
    const onChange = vi.fn()
    const { unmount } = renderHook(() => useChatInputFocus(carrier, onChange))
    act(() => editable.focus())
    expect(onChange).toHaveBeenLastCalledWith(true)
    act(() => input.focus())
    act(() => vi.advanceTimersToNextFrame())
    expect(onChange).toHaveBeenLastCalledWith(true)
    act(() => required(chat.querySelector('textarea')).focus())
    act(() => vi.advanceTimersToNextFrame())
    expect(onChange).toHaveBeenLastCalledWith(true)
    act(() => required(chat.querySelector('button')).focus())
    expect(onChange).toHaveBeenLastCalledWith(false)
    unmount()
  })

  it('does not hold for read-only, disabled, non-text controls or non-editable content', () => {
    const { chat, editable, input } = createChat(carrier)
    const onChange = vi.fn()
    const { unmount } = renderHook(() => useChatInputFocus(carrier, onChange))
    input.readOnly = true
    act(() => input.focus())
    input.readOnly = false
    input.type = 'checkbox'
    act(() => input.dispatchEvent(new FocusEvent('focusin')))
    input.disabled = true
    act(() => input.dispatchEvent(new FocusEvent('focusin')))
    editable.contentEditable = 'false'
    editable.setAttribute('contenteditable', 'false')
    act(() => editable.focus())
    act(() => required(chat.querySelector('button')).focus())
    act(() => vi.advanceTimersToNextFrame())
    expect(onChange).not.toHaveBeenCalledWith(true)
    unmount()
  })

  it('samples a transient iframe blur once after focus settles and never polls', () => {
    const { chat, editable, hasFocus } = createChat(carrier)
    const onChange = vi.fn()
    const { unmount } = renderHook(() => useChatInputFocus(carrier, onChange))
    act(() => editable.focus())
    hasFocus.mockReturnValue(false)
    act(() => required(chat.defaultView).dispatchEvent(new Event('blur')))
    expect(onChange).toHaveBeenLastCalledWith(false)
    hasFocus.mockReturnValue(true)
    act(() => vi.advanceTimersToNextFrame())
    expect(onChange).toHaveBeenLastCalledWith(true)
    hasFocus.mockClear()
    act(() => vi.advanceTimersByTime(10000))
    expect(hasFocus).not.toHaveBeenCalled()
    unmount()
  })

  it('releases removed focused content and reacts when the active editable becomes read-only', async () => {
    const { editable, input } = createChat(carrier)
    const onChange = vi.fn()
    const { unmount } = renderHook(() => useChatInputFocus(carrier, onChange))
    act(() => input.focus())
    expect(onChange).toHaveBeenLastCalledWith(true)
    input.readOnly = true
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(false)
    input.readOnly = false
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(true)
    act(() => editable.focus())
    editable.remove()
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(false)
    unmount()
  })

  it('rebinds a replacement iframe and ignores deferred callbacks from the old document', async () => {
    const old = createChat(carrier)
    const onChange = vi.fn()
    const { unmount } = renderHook(() => useChatInputFocus(carrier, onChange))
    act(() => old.editable.focus())
    expect(onChange).toHaveBeenLastCalledWith(true)
    old.iframe.remove()
    const current = createChat(carrier)
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(false)
    act(() => current.input.focus())
    expect(onChange).toHaveBeenLastCalledWith(true)
    onChange.mockClear()
    act(() => {
      old.chat.dispatchEvent(new FocusEvent('focusout'))
      old.chat.defaultView?.dispatchEvent(new Event('blur'))
      vi.advanceTimersToNextFrame()
    })
    expect(onChange).not.toHaveBeenCalled()
    unmount()
  })

  it('releases focus when the body is replaced and listens to the replacement body', async () => {
    const { chat, editable } = createChat(carrier)
    const onChange = vi.fn()
    const { unmount } = renderHook(() => useChatInputFocus(carrier, onChange))
    act(() => editable.focus())
    const next = chat.createElement('body')
    next.innerHTML = '<textarea></textarea>'
    chat.body.replaceWith(next)
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(false)
    act(() => required(next.querySelector('textarea')).focus())
    expect(onChange).toHaveBeenLastCalledWith(true)
    unmount()
  })

  it('clears inaccessible navigation and removes listeners and deferred work on release', () => {
    const { iframe, chat, editable, hasFocus } = createChat(carrier)
    const onChange = vi.fn()
    const { unmount } = renderHook(() => useChatInputFocus(carrier, onChange))
    act(() => editable.focus())
    expect(onChange).toHaveBeenLastCalledWith(true)
    Object.defineProperty(iframe, 'contentDocument', {
      configurable: true,
      get() {
        throw new DOMException('Cross-origin document', 'SecurityError')
      },
    })
    act(() => iframe.dispatchEvent(new Event('load')))
    expect(onChange).toHaveBeenLastCalledWith(false)
    onChange.mockClear()
    hasFocus.mockClear()
    unmount()
    act(() => {
      chat.dispatchEvent(new FocusEvent('focusin'))
      window.dispatchEvent(new Event('focus'))
      vi.advanceTimersToNextFrame()
    })
    expect(onChange).not.toHaveBeenCalled()
    expect(hasFocus).not.toHaveBeenCalled()
  })
})
