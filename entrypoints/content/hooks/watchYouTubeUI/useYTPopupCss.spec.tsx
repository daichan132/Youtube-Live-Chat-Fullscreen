import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useYTPopupCss } from './useYTPopupCss'

const STYLE_ID = 'ylc-popup-enabled-style'

const TestComponent = ({ enabled }: { enabled: boolean }) => {
  useYTPopupCss(enabled)
  return null
}

beforeEach(() => {
  document.head.innerHTML = ''
})

describe('useYTPopupCss', () => {
  it('adds and updates the popup style when enabled', () => {
    render(<TestComponent enabled />)

    const style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    expect(style).not.toBeNull()
    expect(style?.textContent).toContain('.html5-video-player')
  })

  it('removes the popup style when disabled', () => {
    const { rerender } = render(<TestComponent enabled />)

    rerender(<TestComponent enabled={false} />)

    expect(document.getElementById(STYLE_ID)).toBeNull()
  })

  it('cleans up the style on unmount', () => {
    const { unmount } = render(<TestComponent enabled />)

    unmount()

    expect(document.getElementById(STYLE_ID)).toBeNull()
  })
})
