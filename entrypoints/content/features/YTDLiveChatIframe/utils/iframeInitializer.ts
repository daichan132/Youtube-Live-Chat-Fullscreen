import { IFRAME_STYLE_MARKER_ATTR } from '../constants/styleContract'

type MembershipPickerData = {
  onTapCommand?: {
    parallelCommand?: {
      commands?: Array<{
        innertubeCommand?: {
          ypcGetOffersEndpoint?: {
            params?: string
          }
        }
      }>
    }
  }
}

export const getIframeDocument = (iframe: HTMLIFrameElement) => {
  try {
    return iframe.contentDocument ?? null
  } catch {
    return null
  }
}

export const MEMBERSHIP_FALLBACK_MARKER_ATTR = 'data-ylc-membership-fallback'

type MembershipFallbackRegistration = {
  body: HTMLElement
  listener: EventListener
}

const membershipFallbackRegistrations = new WeakMap<Document, MembershipFallbackRegistration>()

const decodeOfferParams = (params: string | null | undefined) => {
  if (!params) return ''
  const encoded = params.startsWith('sku-') ? params.slice(4) : params
  try {
    return atob(decodeURIComponent(encoded))
  } catch {
    return ''
  }
}

const getMembershipChannelUrl = (item: Element) => {
  const itemData = (item as Element & { data?: unknown }).data
  const params =
    typeof itemData === 'object' && itemData !== null
      ? (itemData as MembershipPickerData).onTapCommand?.parallelCommand?.commands?.[0]?.innertubeCommand?.ypcGetOffersEndpoint?.params
      : null
  const decodedParams = decodeOfferParams(params)
  const channelId = decodedParams.match(/UC[\w-]{20,}/)?.[0]
  if (channelId) return `https://www.youtube.com/channel/${channelId}/join`

  const ownerLink = window.document.querySelector<HTMLAnchorElement>(
    'ytd-video-owner-renderer a[href^="/@"], ytd-video-owner-renderer a[href^="/channel/"], #owner a[href^="/@"], #owner a[href^="/channel/"]',
  )
  const href = ownerLink?.getAttribute('href')
  if (!href) return null

  const url = new URL(href, window.location.origin)
  url.pathname = `${url.pathname.replace(/\/$/, '')}/join`
  url.search = ''
  url.hash = ''
  return url.toString()
}

export const installMembershipFallback = (doc: Document) => {
  const body = doc.body
  if (membershipFallbackRegistrations.has(doc) || body.hasAttribute(MEMBERSHIP_FALLBACK_MARKER_ATTR)) return

  const listener = (event: Event) => {
    const target = event.target
    if (!target || !('closest' in target)) return

    const item = (target as Element).closest('yt-live-chat-product-picker-panel-item-view-model[item-id="Membership"]')
    if (!item) return

    const joinUrl = getMembershipChannelUrl(item)
    if (!joinUrl) return

    event.preventDefault()
    event.stopPropagation()
    window.open(joinUrl, '_blank', 'noopener')
  }

  body.setAttribute(MEMBERSHIP_FALLBACK_MARKER_ATTR, 'true')
  body.addEventListener('click', listener, true)
  membershipFallbackRegistrations.set(doc, { body, listener })
}

export const uninstallMembershipFallback = (doc: Document) => {
  const registration = membershipFallbackRegistrations.get(doc)
  if (!registration) return false

  registration.body.removeEventListener('click', registration.listener, true)
  registration.body.removeAttribute(MEMBERSHIP_FALLBACK_MARKER_ATTR)
  membershipFallbackRegistrations.delete(doc)
  return true
}

export const ensureStyleInjected = (doc: Document, cssText: string) => {
  const existing = doc.head?.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)
  if (existing) return false
  const style = doc.createElement('style')
  style.textContent = cssText
  style.setAttribute(IFRAME_STYLE_MARKER_ATTR, 'true')
  doc.head?.appendChild(style)
  return true
}
