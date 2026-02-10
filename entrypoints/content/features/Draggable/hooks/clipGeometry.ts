export interface Clip {
  header: number
  input: number
}

export interface LayoutGeometry {
  coordinates: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
}

const HEADER_HEIGHT_OFFSET = 8
const INPUT_HEIGHT_OFFSET = 4

const clampClipValue = (value: number) => Math.max(0, value)

const getInputElement = (body: HTMLBodyElement | null | undefined) => {
  return body?.querySelector('yt-live-chat-message-input-renderer') ?? body?.querySelector('yt-live-chat-restricted-participation-renderer')
}

export const measureClipFromBody = (body: HTMLBodyElement | null | undefined): Clip => {
  const headerHeight = body?.querySelector('yt-live-chat-header-renderer')?.clientHeight ?? 0
  const inputHeight = getInputElement(body)?.clientHeight ?? 0

  return {
    header: clampClipValue(headerHeight - HEADER_HEIGHT_OFFSET),
    input: clampClipValue(inputHeight - INPUT_HEIGHT_OFFSET),
  }
}

export const deriveClippedLayout = (baseLayout: LayoutGeometry, clip: Clip): LayoutGeometry => {
  const nextHeight = baseLayout.size.height + clip.header + clip.input

  return {
    coordinates: {
      x: baseLayout.coordinates.x,
      y: baseLayout.coordinates.y - clip.header,
    },
    size: {
      width: baseLayout.size.width,
      height: nextHeight,
    },
  }
}

export const isSameClip = (a: Clip, b: Clip) => a.header === b.header && a.input === b.input

export const isSameLayoutGeometry = (a: LayoutGeometry, b: LayoutGeometry) =>
  a.coordinates.x === b.coordinates.x &&
  a.coordinates.y === b.coordinates.y &&
  a.size.width === b.size.width &&
  a.size.height === b.size.height
