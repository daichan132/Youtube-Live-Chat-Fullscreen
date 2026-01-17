import { useEffect } from 'react'

const styleId = 'ylc-fullscreen-chat-layout-fix'
const className = 'ylc-fullscreen-chat-fix'
const fullscreenRootSelector = `:is(${[
  'ytd-watch-flexy',
  'ytd-watch-flexy[fullscreen]',
  'ytd-watch-flexy.fullscreen',
  'ytd-watch-flexy[is-fullscreen]',
  'ytd-watch-flexy.is-fullscreen',
  'ytd-watch-grid',
  'ytd-watch-grid[fullscreen]',
  'ytd-watch-grid.fullscreen',
  'ytd-watch-grid[is-fullscreen]',
  'ytd-watch-grid.is-fullscreen',
].join(', ')})`
const fullscreenFixCss = `
html.${className} .html5-video-player.ytp-fullscreen {
  width: 100vw !important;
  height: 100vh !important;
  z-index: 1 !important;
}
html.${className} ${fullscreenRootSelector} {
  width: 100vw !important;
  max-width: 100vw !important;
  margin: 0 !important;
}
html.${className} ${fullscreenRootSelector} #chat-container,
html.${className} ${fullscreenRootSelector} #secondary,
html.${className} ${fullscreenRootSelector} #secondary-inner {
  z-index: -1 !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  flex: 0 0 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
html.${className} ${fullscreenRootSelector} #secondary {
  display: none !important;
}
html.${className} ${fullscreenRootSelector} #columns,
html.${className} ${fullscreenRootSelector} #primary,
html.${className} ${fullscreenRootSelector} #primary-inner,
html.${className} ${fullscreenRootSelector} #full-bleed-container {
  width: 100% !important;
  max-width: 100% !important;
  flex: 1 1 auto !important;
  margin: 0 !important;
  padding: 0 !important;
}
html.${className} ${fullscreenRootSelector} #columns {
  display: block !important;
}
html.${className} ${fullscreenRootSelector} #full-bleed-container,
html.${className} ${fullscreenRootSelector} #player,
html.${className} ${fullscreenRootSelector} #player-container-outer,
html.${className} ${fullscreenRootSelector} #player-container-inner,
html.${className} ${fullscreenRootSelector} #movie_player {
  width: 100vw !important;
  max-width: 100vw !important;
  margin: 0 !important;
  padding: 0 !important;
}
html.${className} ${fullscreenRootSelector} #player-container-outer,
html.${className} ${fullscreenRootSelector} #player-container-inner,
html.${className} ${fullscreenRootSelector} #movie_player {
  height: 100vh !important;
  max-height: 100vh !important;
}
html.${className} ${fullscreenRootSelector} #full-bleed-container {
  left: 0 !important;
  right: 0 !important;
}
`

export const useFullscreenChatLayoutFix = (active: boolean) => {
  useEffect(() => {
    const timeouts: number[] = []
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null
    const root = document.documentElement
    const fireResize = () => {
      window.dispatchEvent(new Event('resize'))
    }
    const scheduleResizes = () => {
      // YouTube sometimes recalculates the player size only after a resize tick.
      // Fire a few times to cover async fullscreen/DOM updates.
      timeouts.push(
        ...[0, 150, 500].map(delay =>
          window.setTimeout(() => {
            fireResize()
          }, delay),
        ),
      )
    }

    if (!active) {
      root.classList.remove(className)
      if (styleElement) styleElement.remove()
      scheduleResizes()
      return () => {}
    }

    root.classList.add(className)
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      styleElement.textContent = fullscreenFixCss
      document.head?.appendChild(styleElement)
    }

    scheduleResizes()

    return () => {
      for (const id of timeouts) window.clearTimeout(id)
      root.classList.remove(className)
      styleElement?.remove()
      scheduleResizes()
    }
  }, [active])
}
