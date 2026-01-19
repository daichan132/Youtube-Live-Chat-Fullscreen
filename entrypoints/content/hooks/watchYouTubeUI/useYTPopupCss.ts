import { useEffect } from 'react'

const STYLE_ID = 'ylc-popup-enabled-style'

const cssText = `
.html5-video-player.ytp-fullscreen {
  /* biome-ignore lint/complexity/noImportantStyles: override inline styles in YouTube */
  width: 100vw !important;
  /* biome-ignore lint/complexity/noImportantStyles: override inline styles in YouTube */
  height: 100vh !important;
  z-index: 1;
}
.ytp-chrome-bottom {
  width: 100vw !important;
  z-index: 1;
}

#chat-container {
  z-index: -1;
}
`

function ensureStyleElement(): HTMLStyleElement {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    style.type = 'text/css'
    document.head.appendChild(style)
  }
  return style
}

function removeStyleElement() {
  const style = document.getElementById(STYLE_ID)
  if (style?.parentNode) style.parentNode.removeChild(style)
}

export const useYTPopupCss = (enabled: boolean) => {
  useEffect(() => {
    if (enabled) {
      const style = ensureStyleElement()
      if (style.textContent !== cssText) style.textContent = cssText
    } else {
      removeStyleElement()
    }

    return () => {
      // Clean up when component unmounts (navigation, extension disable, etc.)
      removeStyleElement()
    }
  }, [enabled])
}

export default useYTPopupCss
