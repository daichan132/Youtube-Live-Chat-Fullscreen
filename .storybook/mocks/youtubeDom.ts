const SHADOW_HOST_ID = 'shadow-root-live-chat'

export const ensureYouTubeDomScaffold = () => {
  const existingYouTubeApp = document.querySelector('ytd-app')
  if (!existingYouTubeApp) {
    document.body.append(document.createElement('ytd-app'))
  }

  const host = document.getElementById(SHADOW_HOST_ID) ?? document.createElement('div')
  if (!host.id) {
    host.id = SHADOW_HOST_ID
    document.body.append(host)
  }

  if (!host.shadowRoot) {
    host.attachShadow({ mode: 'open' })
  }
}
