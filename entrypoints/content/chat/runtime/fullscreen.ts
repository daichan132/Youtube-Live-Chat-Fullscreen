export const isFullscreenDomActive = () => Boolean(document.fullscreenElement)

export const isActuallyFullscreen = (isFullscreenState: boolean) => isFullscreenState || isFullscreenDomActive()
