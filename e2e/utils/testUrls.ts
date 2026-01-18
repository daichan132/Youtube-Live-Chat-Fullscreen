const compact = <T>(values: Array<T | null | undefined>): T[] => values.filter(Boolean) as T[]

export const archiveReplayUrls = compact([
  process.env.YLC_ARCHIVE_URL,
  'https://www.youtube.com/watch?v=CQaUs-vNgXo',
  'https://www.youtube.com/watch?v=GxNlHOX4nXI',
])

export const replayUnavailableUrls = compact([
  process.env.YLC_REPLAY_UNAVAILABLE_URL,
  'https://www.youtube.com/watch?v=Q7VwUlT53RY',
])

export const noChatUrls = compact([process.env.YLC_NOCHAT_URL, 'https://www.youtube.com/watch?v=V8yKR1nI3L8'])
