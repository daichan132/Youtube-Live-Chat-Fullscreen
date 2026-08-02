import type { SessionScope } from '../../bootstrap/SessionScope'

const styleId = 'ylc-fullscreen-chat-layout-fix'
const className = 'ylc-fullscreen-chat-fix'
const hiddenChatWidthPx = 400
const hiddenChatHeightPx = 600
const fullscreenPlayerLayer = 1
const parkedNativeChatLayer = -9999
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
  z-index: ${fullscreenPlayerLayer} !important;
}
html.${className} ${fullscreenRootSelector} {
  width: 100vw !important;
  max-width: 100vw !important;
  margin: 0 !important;
}
html.${className} ${fullscreenRootSelector} #secondary {
  position: fixed !important;
  top: -200vh !important;
  left: 0 !important;
  width: ${hiddenChatWidthPx}px !important;
  height: ${hiddenChatHeightPx}px !important;
  min-height: ${hiddenChatHeightPx}px !important;
  visibility: hidden !important;
  pointer-events: none !important;
  z-index: ${parkedNativeChatLayer} !important;
}
html.${className} ${fullscreenRootSelector} #secondary-inner,
html.${className} ${fullscreenRootSelector} #chat-container,
html.${className} ${fullscreenRootSelector} ytd-live-chat-frame {
  width: ${hiddenChatWidthPx}px !important;
  min-width: ${hiddenChatWidthPx}px !important;
  max-width: ${hiddenChatWidthPx}px !important;
  height: ${hiddenChatHeightPx}px !important;
  min-height: ${hiddenChatHeightPx}px !important;
}
html.${className} ${fullscreenRootSelector} #panels-full-bleed-container {
  position: fixed !important;
  top: -200vh !important;
  left: 0 !important;
  width: ${hiddenChatWidthPx}px !important;
  height: ${hiddenChatHeightPx}px !important;
  visibility: hidden !important;
  pointer-events: none !important;
  z-index: ${parkedNativeChatLayer} !important;
}
html.${className} ${fullscreenRootSelector} #panels-full-bleed-container #chat-container,
html.${className} ${fullscreenRootSelector} #panels-full-bleed-container ytd-live-chat-frame {
  width: ${hiddenChatWidthPx}px !important;
  min-width: ${hiddenChatWidthPx}px !important;
  max-width: ${hiddenChatWidthPx}px !important;
  height: ${hiddenChatHeightPx}px !important;
  min-height: ${hiddenChatHeightPx}px !important;
}
html.${className} ${fullscreenRootSelector} #panels {
  position: fixed !important;
  top: -200vh !important;
  left: 0 !important;
  width: ${hiddenChatWidthPx}px !important;
  height: ${hiddenChatHeightPx}px !important;
  min-width: ${hiddenChatWidthPx}px !important;
  max-width: ${hiddenChatWidthPx}px !important;
  visibility: hidden !important;
  z-index: ${parkedNativeChatLayer} !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
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

export type PlayerLayoutLease = {
  reconcile(active: boolean): void
  release(): void
}

export const createPlayerLayoutLease = (scope: SessionScope): PlayerLayoutLease => {
  let resizeTimeouts: number[] = []
  let applied = false

  const clearResizeTimeouts = () => {
    for (const id of resizeTimeouts) scope.clearTimeout(id)
    resizeTimeouts = []
  }

  const scheduleResizes = () => {
    clearResizeTimeouts()
    resizeTimeouts = [0, 150, 500].map(delay =>
      scope.setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, delay),
    )
  }

  const removeLayout = () => {
    document.documentElement.classList.remove(className)
    document.getElementById(styleId)?.remove()
  }

  return {
    reconcile(active) {
      if (applied === active) return
      applied = active
      clearResizeTimeouts()
      if (!active) {
        removeLayout()
        // YouTube can recalculate the fullscreen player/chat split on a later
        // layout tick. Mirror the activation cadence when returning native chat.
        scheduleResizes()
        return
      }

      document.documentElement.classList.add(className)
      let styleElement = document.getElementById(styleId) as HTMLStyleElement | null
      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = styleId
        styleElement.textContent = fullscreenFixCss
        document.head?.appendChild(styleElement)
      }
      scheduleResizes()
    },
    release() {
      clearResizeTimeouts()
      applied = false
      removeLayout()
    },
  }
}
