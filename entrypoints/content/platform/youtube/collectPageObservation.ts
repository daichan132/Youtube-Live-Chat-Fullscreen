import {
  getIframeVideoId,
  isLiveChatIframe,
  isManagedLiveIframe,
  isReplayChatIframe,
  markChatIframeObservedForCurrentVideo,
} from '@/entrypoints/content/chat/shared/iframeDom'
import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatDocument, hasLiveChatRendererReady, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { collectArchiveChatControls } from './chatControls'
import { getYouTubePlayerVideoId, readYouTubePlayerVideoData, type YouTubeMoviePlayer } from './playerVideoData'
import {
  liveHeadBadgeProbe,
  liveTimeDisplayProbe,
  nativeChatHostProbe,
  nativeChatIframeProbe,
  playerProbe,
  queryAllProbes,
  queryFirstProbe,
  rightControlsProbe,
  watchSurfaceProbe,
} from './selectorCatalog'
import type { PageEvidence, PageObservation } from './types'
import { getYouTubeContentSurface } from './youtubeSurface'

type PlayerLiveState = 'live' | 'ended-live' | 'vod' | 'unknown'

const getRoute = (): PageEvidence['route'] => getYouTubeContentSurface(window.location.href)?.route ?? 'other'

const getPlayerLiveState = (
  player: YouTubeMoviePlayer | null,
  videoId: string | null,
  watch: HTMLElement | null,
  probeIds: Set<string>,
): PlayerLiveState => {
  const data = readYouTubePlayerVideoData(player)
  const playerVideoId = getYouTubePlayerVideoId(player, data)
  if (videoId && playerVideoId && playerVideoId !== videoId) return 'unknown'
  if (data?.isLive === true) return 'live'
  if (data?.isLive === false) return data.isLiveContent === true ? 'ended-live' : 'vod'
  if (data?.isLiveContent === false) return 'vod'

  const watchVideoId = watch?.getAttribute('video-id')
  if (videoId && watchVideoId && watchVideoId !== videoId) return 'unknown'
  if (watch?.hasAttribute('is-live-now')) return 'live'
  for (const probe of [liveTimeDisplayProbe, liveHeadBadgeProbe]) {
    const result = queryFirstProbe(document, probe)
    if (result.probeId) {
      probeIds.add(result.probeId)
      return 'live'
    }
  }
  return 'unknown'
}

const iframeMatchesVideo = (iframe: HTMLIFrameElement, videoId: string | null) => {
  if (!videoId) return false
  return getIframeVideoId(iframe) === videoId
}

const getVideoMode = (sourceKind: PageEvidence['sourceKind'], playerLiveState: PlayerLiveState): PageEvidence['videoMode'] => {
  if (sourceKind === 'native-replay' || playerLiveState === 'ended-live') return 'archive'
  if (sourceKind === 'native-live' || sourceKind === 'managed-live' || playerLiveState === 'live') return 'live'
  if (playerLiveState === 'vod') return 'vod'
  return 'unknown'
}

export const collectPageObservation = (leasedIframe: HTMLIFrameElement | null = null, generation = 0): PageObservation => {
  const probeIds = new Set<string>()
  const videoId = getCurrentYouTubeVideoId()
  const watchProbe = queryFirstProbe<HTMLElement>(document, watchSurfaceProbe)
  if (watchProbe.probeId) probeIds.add(watchProbe.probeId)
  const playerResult = queryFirstProbe<YouTubeMoviePlayer>(document, playerProbe)
  if (playerResult.probeId) probeIds.add(playerResult.probeId)
  const player = playerResult.element
  const rightControlsResult = player ? queryFirstProbe<HTMLElement>(player, rightControlsProbe) : { element: null, probeId: null }
  if (rightControlsResult.probeId) probeIds.add(rightControlsResult.probeId)

  const chatHostProbes = queryAllProbes<HTMLElement>(document, nativeChatHostProbe)
  const iframeProbes = queryAllProbes<HTMLIFrameElement>(document, nativeChatIframeProbe)
  for (const probeId of chatHostProbes.probeIds) probeIds.add(probeId)
  for (const probeId of iframeProbes.probeIds) probeIds.add(probeId)

  for (const iframe of iframeProbes.elements) {
    if (!getIframeVideoId(iframe)) markChatIframeObservedForCurrentVideo(iframe, videoId)
  }

  const nativeChatIframe = iframeProbes.elements.find(iframe => iframeMatchesVideo(iframe, videoId)) ?? null
  const currentLeaseMatches = leasedIframe !== null && iframeMatchesVideo(leasedIframe, videoId) && leasedIframe.isConnected
  const candidateChatIframe = nativeChatIframe ?? (currentLeaseMatches ? leasedIframe : null)
  const nativeChatHost =
    (nativeChatIframe?.closest('ytd-live-chat-frame') as HTMLElement | null) ??
    chatHostProbes.elements.find(host => host.getAttribute('video-id') === videoId) ??
    null
  const candidateSourceKind: PageEvidence['sourceKind'] = candidateChatIframe
    ? isReplayChatIframe(candidateChatIframe)
      ? 'native-replay'
      : isManagedLiveIframe(candidateChatIframe)
        ? 'managed-live'
        : isLiveChatIframe(candidateChatIframe)
          ? 'native-live'
          : null
    : null
  const playerLiveState = getPlayerLiveState(player, videoId, watchProbe.element, probeIds)
  const archiveControls = collectArchiveChatControls()
  const selectedArchiveControl = archiveControls.replay ?? archiveControls.native
  const archiveOpenControl = selectedArchiveControl?.element ?? null
  if (selectedArchiveControl) probeIds.add(selectedArchiveControl.probeId)

  const archiveStateKnown = playerLiveState === 'ended-live' || playerLiveState === 'vod' || candidateSourceKind === 'native-replay'
  const canOpenArchiveChat = archiveControls.replay !== null || (archiveStateKnown && archiveControls.canOpen)

  // YouTube can retain either a borrowed or managed live iframe while the
  // player is being replaced. Preserve it while live state is unknown, but
  // release it once the player or a replay-labelled control proves archive state.
  const liveSourceSupersededByArchive =
    (candidateSourceKind === 'managed-live' || candidateSourceKind === 'native-live') &&
    (playerLiveState === 'ended-live' || playerLiveState === 'vod' || archiveControls.replay !== null)
  const chatIframe = liveSourceSupersededByArchive ? null : candidateChatIframe
  const sourceKind = liveSourceSupersededByArchive ? null : candidateSourceKind
  const chatDocument = chatIframe ? getLiveChatDocument(chatIframe) : null
  const chatUnavailable = Boolean(chatDocument && isLiveChatUnavailable(chatDocument))
  const chatDocumentReady = Boolean(chatDocument && hasLiveChatRendererReady(chatDocument))
  const videoMode = liveSourceSupersededByArchive ? 'archive' : getVideoMode(sourceKind, playerLiveState)
  const chatAvailability: PageEvidence['chatAvailability'] = chatUnavailable
    ? 'unavailable'
    : sourceKind === 'native-replay'
      ? chatDocumentReady
        ? 'ready'
        : 'pending'
      : sourceKind !== null || playerLiveState === 'live'
        ? 'ready'
        : playerLiveState === 'vod' && !canOpenArchiveChat
          ? 'unavailable'
          : 'pending'
  const fullscreenRoot = document.fullscreenElement

  return {
    evidence: {
      generation,
      videoId,
      route: getRoute(),
      fullscreen: fullscreenRoot !== null,
      videoMode,
      chatAvailability,
      capabilities: {
        canBorrowNativeChat: sourceKind === 'native-live' || (sourceKind === 'native-replay' && chatAvailability === 'ready'),
        canCreateManagedLiveChat: playerLiveState === 'live',
        canOpenArchiveChat,
        canRestoreNativeChat: nativeChatIframe !== null && sourceKind !== 'managed-live',
        canMountOverlay: player !== null && fullscreenRoot !== null,
        canMountPlayerSwitch: rightControlsResult.element !== null,
      },
      sourceKind,
      probeIds: [...probeIds],
    },
    targets: {
      player,
      fullscreenRoot,
      rightControls: rightControlsResult.element,
      nativeChatHost,
      nativeChatIframe,
      chatIframe,
      archiveOpenControl,
    },
  }
}
