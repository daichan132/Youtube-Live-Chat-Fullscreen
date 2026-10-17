const YOUTUBE_ORIGIN = 'https://www.youtube.com'

export const getAllowedParentOrigin = (href: string) => {
  try {
    const origin = new URL(href).searchParams.get('parentOrigin')
    return origin === YOUTUBE_ORIGIN ? origin : null
  } catch {
    return null
  }
}
