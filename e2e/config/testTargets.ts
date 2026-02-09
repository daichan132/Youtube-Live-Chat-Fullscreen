type ArchiveTargets = {
  replayUrl: string
  transitionFromUrl: string
  transitionToUrl: string
}

type ReplayUnavailableTargets = {
  url: string
}

type NoChatTargets = {
  url: string
}

type LiveTargets = {
  preferredUrl: string | null
}

type LiveSearchTargets = {
  urls: string[]
}

export type E2ETestTargets = {
  archive: ArchiveTargets
  replayUnavailable: ReplayUnavailableTargets
  noChat: NoChatTargets
  live: LiveTargets
  liveSearch: LiveSearchTargets
}

const DEFAULT_ARCHIVE_REPLAY_URL = 'https://www.youtube.com/watch?v=xyiEiNWaOfY&list=PLFZAmR0gqBTIoMCCUfEaKER4m6I98GrWj'
const DEFAULT_ARCHIVE_TRANSITION_FROM_URL = 'https://www.youtube.com/watch?v=xyiEiNWaOfY&list=PLFZAmR0gqBTIoMCCUfEaKER4m6I98GrWj'
const DEFAULT_ARCHIVE_TRANSITION_TO_URL = 'https://www.youtube.com/watch?v=akIQbHSh_oU&list=PLFZAmR0gqBTIoMCCUfEaKER4m6I98GrWj&index=2'
const DEFAULT_REPLAY_UNAVAILABLE_URL = 'https://www.youtube.com/watch?v=Q7VwUlT53RY'
const DEFAULT_NO_CHAT_URL = 'https://www.youtube.com/watch?v=V8yKR1nI3L8'
const DEFAULT_LIVE_SEARCH_URL = 'https://www.youtube.com/results?search_query=vtuber&sp=EgJAAQ%253D%253D'

const normalizeEnv = (value: string | undefined) => {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export const getE2ETestTargets = (): E2ETestTargets => {
  const archiveReplayUrl = normalizeEnv(process.env.YLC_ARCHIVE_URL) ?? DEFAULT_ARCHIVE_REPLAY_URL
  const archiveTransitionFromUrl = normalizeEnv(process.env.YLC_ARCHIVE_URL) ?? DEFAULT_ARCHIVE_TRANSITION_FROM_URL
  const archiveTransitionToUrl = normalizeEnv(process.env.YLC_ARCHIVE_NEXT_URL) ?? DEFAULT_ARCHIVE_TRANSITION_TO_URL
  const replayUnavailableUrl = normalizeEnv(process.env.YLC_REPLAY_UNAVAILABLE_URL) ?? DEFAULT_REPLAY_UNAVAILABLE_URL
  const noChatUrl = normalizeEnv(process.env.YLC_NOCHAT_URL) ?? DEFAULT_NO_CHAT_URL
  const livePreferredUrl = normalizeEnv(process.env.YLC_LIVE_URL)

  return {
    archive: {
      replayUrl: archiveReplayUrl,
      transitionFromUrl: archiveTransitionFromUrl,
      transitionToUrl: archiveTransitionToUrl,
    },
    replayUnavailable: {
      url: replayUnavailableUrl,
    },
    noChat: {
      url: noChatUrl,
    },
    live: {
      preferredUrl: livePreferredUrl,
    },
    liveSearch: {
      urls: [DEFAULT_LIVE_SEARCH_URL],
    },
  }
}
