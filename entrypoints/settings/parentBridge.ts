const YOUTUBE_ORIGIN = 'https://www.youtube.com'

export const getAllowedParentOrigin = (href: string) => {
  try {
    const origin = new URL(href).searchParams.get('parentOrigin')
    return origin === YOUTUBE_ORIGIN ? origin : null
  } catch {
    return null
  }
}

export const isTrustedParentMessage = (event: MessageEvent, parentOrigin: string | null, parentWindow: Window) =>
  parentOrigin !== null && event.source === parentWindow && event.origin === parentOrigin
