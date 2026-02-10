import { useEffect } from 'react'

const STYLE_ID = 'ylc-popup-enabled-style'
const ENABLE_CLASS = 'ylc-popup-enabled'

const cssText = `
html.${ENABLE_CLASS} .html5-video-player.ytp-fullscreen {
  /* biome-ignore lint/complexity/noImportantStyles: override inline styles in YouTube */
  width: 100vw !important;
  /* biome-ignore lint/complexity/noImportantStyles: override inline styles in YouTube */
  height: 100vh !important;
  z-index: 1;
}
html.${ENABLE_CLASS} .ytp-chrome-bottom {
  width: 100vw !important;
  z-index: 1;
}

html.${ENABLE_CLASS} #chat-container {
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

function setEnableClass(enabled: boolean) {
  document.documentElement.classList.toggle(ENABLE_CLASS, enabled)
}

export const useYTPopupCss = (enabled: boolean) => {
  useEffect(() => {
    if (enabled) {
      const style = ensureStyleElement()
      if (style.textContent !== cssText) style.textContent = cssText
      setEnableClass(true)
    } else {
      setEnableClass(false)
      removeStyleElement()
    }

    return () => {
      // Clean up when component unmounts (navigation, extension disable, etc.)
      setEnableClass(false)
      removeStyleElement()
    }
  }, [enabled])
}

export default useYTPopupCss
