export type ScenarioDocumentInitialization = {
  videoId: string
  isLive: boolean
  nativeChatNavigationHref: string | null
  generation: number
}

/** Self-contained browser code, serialized for initial HTML and evaluated after SPA replacement. */
export const initializeScenarioDocument = ({ videoId, isLive, nativeChatNavigationHref, generation }: ScenarioDocumentInitialization) => {
  const player = document.getElementById('movie_player')
  const fullscreenButton = document.querySelector<HTMLButtonElement>('.ytp-fullscreen-button')
  const boundaryProbe = document.querySelector<HTMLButtonElement>('[data-ylc-player-boundary-probe]')
  if (!player || !fullscreenButton || !boundaryProbe) throw new Error('Compiled scenario document is missing its player contract.')

  if (nativeChatNavigationHref) {
    const iframe = document.querySelector<HTMLIFrameElement>('ytd-live-chat-frame > #chatframe')
    iframe?.contentWindow?.location.assign(nativeChatNavigationHref)
  }

  player.dataset.ylcFixtureGeneration = String(generation)
  Object.assign(player, {
    getVideoData: () => ({ isLive, isLiveContent: isLive, video_id: videoId }),
  })
  fullscreenButton.addEventListener('click', async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    await player.requestFullscreen()
  })
  boundaryProbe.addEventListener('click', event => {
    const target = event.currentTarget as HTMLElement
    target.dataset.ylcClicks = String(Number(target.dataset.ylcClicks ?? 0) + 1)
  })
}

export const scenarioDocumentInitializationScript = (input: ScenarioDocumentInitialization) =>
  `(${initializeScenarioDocument.toString()})(${JSON.stringify(input).replaceAll('<', '\\u003c')});`
