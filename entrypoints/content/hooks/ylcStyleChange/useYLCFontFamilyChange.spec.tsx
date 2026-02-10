import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCFontFamilyChange } from './useYLCFontFamilyChange'

const setProperty = vi.fn()
const getIframeWindow = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({
    getIframeWindow,
    setProperty,
  }),
}))

describe('useYLCFontFamilyChange', () => {
  beforeEach(() => {
    setProperty.mockClear()
    getIframeWindow.mockClear()
  })

  it('injects a custom font import and updates the font-family property', () => {
    const doc = document.implementation.createHTMLDocument('')
    getIframeWindow.mockReturnValue({ document: doc })

    const { result } = renderHook(() => useYLCFontFamilyChange())

    act(() => {
      result.current.changeFontFamily('Noto Sans')
    })

    const styleElement = doc.head.querySelector('#custom-font-style') as HTMLStyleElement
    expect(styleElement).not.toBeNull()
    expect(styleElement.textContent).toBe("@import url('https://fonts.googleapis.com/css2?family=Noto+Sans&display=swap');")
    expect(setProperty).toHaveBeenCalledWith('font-family', '"Noto Sans", Roboto, Arial, sans-serif')
  })

  it('overwrites the existing custom font style element', () => {
    const doc = document.implementation.createHTMLDocument('')
    const styleElement = doc.createElement('style')
    styleElement.id = 'custom-font-style'
    styleElement.textContent = 'old'
    doc.head.appendChild(styleElement)
    getIframeWindow.mockReturnValue({ document: doc })

    const { result } = renderHook(() => useYLCFontFamilyChange())

    act(() => {
      result.current.changeFontFamily('Roboto Slab')
    })

    const styleElements = doc.head.querySelectorAll('#custom-font-style')
    expect(styleElements).toHaveLength(1)
    expect(styleElements[0]?.textContent).toBe("@import url('https://fonts.googleapis.com/css2?family=Roboto+Slab&display=swap');")
    expect(setProperty).toHaveBeenCalledWith('font-family', '"Roboto Slab", Roboto, Arial, sans-serif')
  })

  it('removes imported font style and falls back when font family is empty', () => {
    const doc = document.implementation.createHTMLDocument('')
    const styleElement = doc.createElement('style')
    styleElement.id = 'custom-font-style'
    styleElement.textContent = 'old'
    doc.head.appendChild(styleElement)
    getIframeWindow.mockReturnValue({ document: doc })

    const { result } = renderHook(() => useYLCFontFamilyChange())

    act(() => {
      result.current.changeFontFamily('')
    })

    expect(doc.head.querySelector('#custom-font-style')).toBeNull()
    expect(setProperty).toHaveBeenCalledWith('font-family', 'Roboto, Arial, sans-serif')
  })
})
