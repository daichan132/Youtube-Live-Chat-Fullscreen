import {
  getIframeVideoId,
  isLiveChatIframe,
  isManagedLiveIframe,
  isReplayChatIframe,
  markChatIframeObservedForCurrentVideo,
} from '@/entrypoints/content/chat/shared/iframeDom'
import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatDocument, hasLiveChatRendererReady, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { getArchiveNativeOpenControl, hasArchiveNativeOpenControl } from '@/entrypoints/content/utils/nativeChat'
import { getYouTubePlayerVideoId, readYouTubePlayerVideoData, type YouTubeMoviePlayer } from './playerVideoData'
import {
  archivePlayerChatToggleProbe,
  archiveSidebarOpenControlProbe,
  identifyProbeForElement,
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

const getRoute = (): PageEvidence['route'] => getYouTubeContentSurface(window.location.href)?.route ?? 'other'

const getPlayerLiveState = (player: YouTubeMoviePlayer | null, videoId: string | null, watch: HTMLElement | null) => {
  const data = readYouTubePlayerVideoData(player)
  const playerVideoId = getYouTubePlayerVideoId(player, data)
  if (videoId && playerVideoId && playerVideoId !== videoId) return null
  if (data?.isLive === true) return true
  if (data?.isLive === false) return data.isLiveContent === true ? null : false
  if (data?.isLiveContent === false) return false

  const watchVideoId = watch?.getAttribute('video-id')
  if (videoId && watchVideoId && watchVideoId !== videoId) return null
  if (watch?.hasAttribute('is-live-now')) return true
  if (document.querySelector('.ytp-time-display.ytp-live, .ytp-live-badge.ytp-live-badge-is-livehead')) return true
  return null
}

const iframeMatchesVideo = (iframe: HTMLIFrameElement, videoId: string | null) => {
  if (!videoId) return false
  return getIframeVideoId(iframe) === videoId
}

const getVideoMode = (sourceKind: PageEvidence['sourceKind'], playerIsLive: boolean | null): PageEvidence['videoMode'] => {
  if (sourceKind === 'native-replay') return 'archive'
  if (sourceKind === 'native-live' || sourceKind === 'managed-live' || playerIsLive === true) return 'live'
  if (playerIsLive === false) return 'vod'
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
  const playerIsLive = getPlayerLiveState(player, videoId, watchProbe.element)
  const archiveOpenControl = getArchiveNativeOpenControl()
  const archiveOpenProbeId =
    identifyProbeForElement(document, archiveSidebarOpenControlProbe, archiveOpenControl) ??
    identifyProbeForElement(document, archivePlayerChatToggleProbe, archiveOpenControl)
  if (archiveOpenProbeId) probeIds.add(archiveOpenProbeId)
  const canOpenArchiveChat = archiveOpenControl !== null || hasArchiveNativeOpenControl()

  // A managed live iframe can outlive the live player state. Once YouTube
  // exposes an archive control and no longer confirms the stream as live,
  // treat the managed source as stale so the runtime can open and borrow replay.
  const managedLiveSupersededByArchive = candidateSourceKind === 'managed-live' && playerIsLive !== true && canOpenArchiveChat
  const chatIframe = managedLiveSupersededByArchive ? null : candidateChatIframe
  const sourceKind = managedLiveSupersededByArchive ? null : candidateSourceKind
  const chatDocument = chatIframe ? getLiveChatDocument(chatIframe) : null
  const chatUnavailable = Boolean(chatDocument && isLiveChatUnavailable(chatDocument))
  const chatDocumentReady = Boolean(chatDocument && hasLiveChatRendererReady(chatDocument))
  const videoMode = managedLiveSupersededByArchive ? 'archive' : getVideoMode(sourceKind, playerIsLive)
  const chatAvailability: PageEvidence['chatAvailability'] = chatUnavailable
    ? 'unavailable'
    : sourceKind === 'native-replay'
      ? chatDocumentReady
        ? 'ready'
        : 'pending'
      : sourceKind !== null || playerIsLive === true
        ? 'ready'
        : playerIsLive === false && !canOpenArchiveChat
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
        canCreateManagedLiveChat: playerIsLive === true,
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
