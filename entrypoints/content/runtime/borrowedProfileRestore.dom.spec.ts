import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CUSTOM_FONT_STYLE_ID,
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { createSessionScope, type SessionScope } from '../bootstrap/SessionScope'
import { ResourceReconciler } from './ResourceReconciler'

const videoId = 'profile-restore-video'
const resources: ResourceReconciler[] = []
const scopes: SessionScope[] = []

const createNativeDocument = () => {
  const doc = document.implementation.createHTMLDocument('Native chat')
  doc.documentElement.style.setProperty('--yt-live-chat-background-color', 'rgb(7, 8, 9)', 'important')
  doc.documentElement.style.setProperty('--extension-yt-live-link-color', 'rgb(1, 90, 170)', 'important')
  doc.body.style.setProperty('backdrop-filter', 'blur(3px)', 'important')
  const font = doc.createElement('style')
  font.id = CUSTOM_FONT_STYLE_ID
  font.textContent = '@font-face { font-family: NativeChat; }'
  doc.head.append(font)
  const header = doc.createElement('yt-live-chat-header-renderer')
  doc.body.append(header)
  return { font, doc, header }
}

const borrow = (attachImmediately = true) => {
  const host = document.createElement('ytd-live-chat-frame')
  host.setAttribute('video-id', videoId)
  const iframe = document.createElement('iframe')
  iframe.src = `https://www.youtube.com/live_chat_replay?v=${videoId}`
  const native = createNativeDocument()
  let currentDocument = native.doc
  Object.defineProperty(iframe, 'contentDocument', { get: () => currentDocument })
  host.append(iframe)
  const carrier = document.createElement('div')
  document.body.append(host, carrier)
  const reconciler = new ResourceReconciler()
  const scope = createSessionScope(4)
  resources.push(reconciler)
  scopes.push(scope)
  reconciler.setProfile(DEFAULT_CHAT_PROFILE)
  reconciler.createIframe({ kind: 'available', videoId, mode: 'archive', source: { kind: 'archive_borrow', iframe } }, scope.generation)
  const onLoad = () => {
    reconciler.initializeIframe(scope, onLoad)
  }
  const attach = () => {
    reconciler.setOverlayContainer(carrier)
    return reconciler.initializeIframe(scope, onLoad)
  }
  if (attachImmediately) expect(attach()).toBe(true)
  return {
    reconciler,
    iframe,
    host,
    native,
    attach,
    replaceDocument: (doc: Document) => {
      currentDocument = doc
    },
  }
}

const expectNativeStyles = ({ doc, font }: ReturnType<typeof createNativeDocument>) => {
  expect(doc.documentElement.style.getPropertyValue('--yt-live-chat-background-color')).toBe('rgb(7, 8, 9)')
  expect(doc.documentElement.style.getPropertyPriority('--yt-live-chat-background-color')).toBe('important')
  expect(doc.documentElement.style.getPropertyValue('--extension-yt-live-link-color')).toBe('rgb(1, 90, 170)')
  expect(doc.documentElement.style.getPropertyPriority('--extension-yt-live-link-color')).toBe('important')
  expect(doc.body.style.getPropertyValue('backdrop-filter')).toBe('blur(3px)')
  expect(doc.body.style.getPropertyPriority('backdrop-filter')).toBe('important')
  expect(doc.head.querySelector(`#${CUSTOM_FONT_STYLE_ID}`)).toBe(font)
  expect(font.textContent).toBe('@font-face { font-family: NativeChat; }')
}

beforeEach(() => {
  window.history.replaceState({}, '', `/watch?v=${videoId}`)
  document.body.replaceChildren()
})

afterEach(() => {
  try {
    for (const reconciler of resources.splice(0)) reconciler.clear()
  } finally {
    for (const scope of scopes.splice(0)) scope.dispose()
    document.body.replaceChildren()
  }
})

describe('borrowed document restoration after profile updates', () => {
  it('leaves native chat untouched until attachment, then applies the latest profile and interaction', () => {
    const { reconciler, iframe, host, native, attach } = borrow(false)

    reconciler.setProfile({
      ...DEFAULT_CHAT_PROFILE,
      appearance: { ...DEFAULT_CHAT_PROFILE.appearance, fontSize: 19 },
      display: { ...DEFAULT_CHAT_PROFILE.display, contentMode: 'messages-only' },
    })
    reconciler.setInteraction('idle')

    expect(iframe.parentElement).toBe(host)
    expectNativeStyles(native)
    expect(native.doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(native.header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')

    expect(attach()).toBe(true)
    expect(native.doc.documentElement.style.getPropertyValue('--extension-yt-live-chat-font-size')).toBe('19px')
    expect(native.doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    reconciler.releaseIframe(null)

    expect(iframe.parentElement).toBe(host)
    expectNativeStyles(native)
    expect(native.doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(native.header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
  })

  it.each([false, true])('preserves native replacement styles when a profile arrives before load (load delivered: %s)', loadDelivered => {
    const { reconciler, iframe, host, replaceDocument } = borrow()
    const replacement = createNativeDocument()
    replaceDocument(replacement.doc)

    reconciler.setProfile({ ...DEFAULT_CHAT_PROFILE, appearance: { ...DEFAULT_CHAT_PROFILE.appearance, fontSize: 18 } })
    expect(replacement.doc.documentElement.style.getPropertyValue('--yt-live-chat-background-color')).toBe('transparent')
    expect(replacement.font.parentNode).toBeNull()
    if (loadDelivered) iframe.dispatchEvent(new Event('load'))
    reconciler.releaseIframe(null)

    expect(iframe.parentElement).toBe(host)
    expectNativeStyles(replacement)
  })

  it('keeps the original snapshot across repeated profile changes and load notifications for the same document', () => {
    const { reconciler, iframe, host, native } = borrow()

    for (const fontSize of [16, 20]) {
      reconciler.setProfile({ ...DEFAULT_CHAT_PROFILE, appearance: { ...DEFAULT_CHAT_PROFILE.appearance, fontSize } })
      iframe.dispatchEvent(new Event('load'))
    }
    expect(native.doc.documentElement.style.getPropertyValue('--extension-yt-live-link-color')).toBe('rgba(3, 66, 148, 1)')
    reconciler.releaseIframe(null)

    expect(iframe.parentElement).toBe(host)
    expectNativeStyles(native)
  })
})
