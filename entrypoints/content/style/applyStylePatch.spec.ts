import { describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { applyChatProfileToDocument, applyStylePatch, readYouTubeMembershipDefaultColor } from './applyStylePatch'

describe('applyStylePatch', () => {
  it('applies document and body properties and loads only the selected font', () => {
    const iframeDocument = document.implementation.createHTMLDocument('')

    applyStylePatch(iframeDocument, {
      documentProperties: { '--test-document-property': 'value' },
      bodyProperties: { 'background-color': 'transparent' },
      fontFamily: 'Noto Sans',
    })

    expect(iframeDocument.documentElement.style.getPropertyValue('--test-document-property')).toBe('value')
    expect(iframeDocument.body.style.backgroundColor).toBe('transparent')
    expect(iframeDocument.head.querySelectorAll('#custom-font-style')).toHaveLength(1)
    expect(iframeDocument.head.querySelector('#custom-font-style')?.textContent).toContain('family=Noto+Sans')

    applyStylePatch(iframeDocument, {
      documentProperties: {},
      bodyProperties: {},
      fontFamily: 'Roboto Slab',
    })

    expect(iframeDocument.head.querySelectorAll('#custom-font-style')).toHaveLength(1)
    expect(iframeDocument.head.querySelector('#custom-font-style')?.textContent).toContain('family=Roboto+Slab')
    expect(iframeDocument.head.querySelector('#custom-font-style')?.textContent).not.toContain('Noto+Sans')
  })

  it('resolves YouTube default membership color from the current document without mutating settings', () => {
    const iframeDocument = document.implementation.createHTMLDocument('')
    iframeDocument.documentElement.style.setProperty('--yt-live-chat-sponsor-color', 'rgb(22, 163, 74)')
    const profile = {
      ...DEFAULT_CHAT_PROFILE,
      appearance: {
        ...DEFAULT_CHAT_PROFILE.appearance,
        membershipNameColor: { mode: 'youtube-default' as const },
      },
    }

    expect(readYouTubeMembershipDefaultColor(iframeDocument)).toEqual({ r: 22, g: 163, b: 74, a: 1 })

    applyChatProfileToDocument(iframeDocument, profile, { firefox: false })

    expect(iframeDocument.documentElement.style.getPropertyValue('--extension-yt-live-membership-name-color')).toBe('rgba(22, 163, 74, 1)')
    expect(profile.appearance.membershipNameColor).toEqual({ mode: 'youtube-default' })
  })

  it('applies configured blur to the Firefox iframe document', () => {
    const iframeDocument = document.implementation.createHTMLDocument('')
    const profile = {
      ...DEFAULT_CHAT_PROFILE,
      appearance: {
        ...DEFAULT_CHAT_PROFILE.appearance,
        blur: 12,
      },
    }

    applyChatProfileToDocument(iframeDocument, profile, { firefox: true })

    expect(iframeDocument.documentElement.style.getPropertyValue('--extension-yt-live-backdrop-filter')).toBe('blur(12px)')
    expect(iframeDocument.body.style.getPropertyValue('backdrop-filter')).toBe('blur(12px)')
  })
})
