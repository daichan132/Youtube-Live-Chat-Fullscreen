import { SWITCH_BUTTON_CONTAINER_ID } from '../../entrypoints/content/constants/domIds'
import { fullscreenButtonProbe, nativeChatHostProbe, playerProbe } from '../../entrypoints/content/platform/youtube/selectorCatalog'

export const switchButtonContainerSelector = `#${SWITCH_BUTTON_CONTAINER_ID}`
export const switchButtonSelector = `${switchButtonContainerSelector} button.ytp-button`

export const MOVIE_PLAYER = playerProbe.selectors[0]
export const FULLSCREEN_BUTTON = fullscreenButtonProbe.selectors[0]
export const SHADOW_HOST = '#shadow-root-live-chat'
export const NATIVE_CHAT_FRAME = nativeChatHostProbe.selectors[0]
