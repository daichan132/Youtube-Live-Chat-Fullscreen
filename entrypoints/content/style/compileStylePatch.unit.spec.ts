import { describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import type { ChatProfile } from '@/shared/settings/model'
import { compileStylePatch } from './compileStylePatch'

const createProfile = (appearance: Partial<ChatProfile['appearance']> = {}): ChatProfile => ({
  ...DEFAULT_CHAT_PROFILE,
  appearance: {
    ...DEFAULT_CHAT_PROFILE.appearance,
    ...appearance,
  },
})

describe('compileStylePatch', () => {
  it.each([
    { alpha: 0.8, menu: 'rgba(100, 120, 140, 0.856)', panel: 'rgba(100, 120, 140, 0.224)' },
    { alpha: 0, menu: 'rgba(100, 120, 140, 0.28)', panel: 'rgba(100, 120, 140, 0)' },
  ])('keeps public backgrounds transparent and compiles internal surfaces for alpha $alpha', ({ alpha, menu, panel }) => {
    const patch = compileStylePatch(
      createProfile({
        backgroundColor: { r: 100, g: 120, b: 140, a: alpha },
      }),
      { membershipDefaultColor: null, firefox: false },
    )

    expect(patch.documentProperties['--yt-live-chat-background-color']).toBe('transparent')
    expect(patch.documentProperties['--yt-live-chat-header-background-color']).toBe('transparent')
    expect(patch.documentProperties['--extension-yt-live-menu-background-color']).toBe(menu)
    expect(patch.documentProperties['--extension-yt-live-panel-background-color']).toBe(panel)
  })

  it('keeps floating picker text separate from underlying messages without changing main-chat transparency', () => {
    for (const alpha of [0, 0.4, 0.94, 1]) {
      const patch = compileStylePatch(createProfile({ backgroundColor: { r: 12, g: 34, b: 56, a: alpha } }), {
        membershipDefaultColor: null,
        firefox: false,
      })
      expect(patch.documentProperties['--extension-yt-live-floating-panel-background-color']).toBe(
        `rgba(12, 34, 56, ${Math.max(0.96, alpha)})`,
      )
      expect(patch.documentProperties['--yt-live-chat-background-color']).toBe('transparent')
    }
  })

  it('publishes a distinct readable link color without changing the configured message ink', () => {
    const patch = compileStylePatch(
      createProfile({
        backgroundColor: { r: 12, g: 16, b: 24, a: 0.94 },
        fontColor: { r: 245, g: 240, b: 230, a: 0.6 },
      }),
      { membershipDefaultColor: null, firefox: false },
    )

    expect(patch.documentProperties['--extension-yt-live-link-color']).toBe('rgba(151, 204, 255, 1)')
    expect(patch.documentProperties['--extension-yt-live-font-color']).toBe('rgba(245, 240, 230, 0.6)')
  })

  it('uses the runtime YouTube membership color without changing the profile', () => {
    const profile = createProfile({ membershipNameColor: { mode: 'youtube-default' } })
    const patch = compileStylePatch(profile, {
      membershipDefaultColor: { r: 22, g: 163, b: 74, a: 1 },
      firefox: false,
    })

    expect(patch.documentProperties['--extension-yt-live-membership-name-color']).toBe('rgba(22, 163, 74, 1)')
    expect(profile.appearance.membershipNameColor).toEqual({ mode: 'youtube-default' })
  })

  it('uses YouTube semantic CSS directly until the runtime exposes a parseable default', () => {
    const patch = compileStylePatch(createProfile({ membershipNameColor: { mode: 'youtube-default' } }), {
      membershipDefaultColor: null,
      firefox: false,
    })

    expect(patch.documentProperties['--extension-yt-live-membership-name-color']).toBe('var(--yt-live-chat-sponsor-color)')
  })

  it('compiles custom membership color, display flags, geometry-independent spacing, and font', () => {
    const patch = compileStylePatch(
      createProfile({
        backgroundColor: { r: 10, g: 20, b: 30, a: 0.4 },
        fontColor: { r: 90, g: 100, b: 110, a: 0.8 },
        membershipNameColor: { mode: 'custom', value: { r: 1, g: 2, b: 3, a: 0.5 } },
        fontFamily: 'Noto Sans',
        fontSize: 18,
        spacing: 4,
        showUserName: false,
        showUserIcon: true,
        showSuperChatBar: false,
      }),
      { membershipDefaultColor: null, firefox: false },
    )

    expect(patch.documentProperties).toMatchObject({
      '--extension-yt-live-font-color': 'rgba(90, 100, 110, 0.8)',
      '--extension-yt-live-secondary-font-color': 'rgba(90, 100, 110, 0.4)',
      '--extension-yt-live-control-background-color': 'rgba(90, 100, 110, 0.096)',
      '--extension-yt-live-menu-hover-background-color': 'rgba(90, 100, 110, 0.096)',
      '--extension-yt-live-control-border-color': 'rgba(90, 100, 110, 0.096)',
      '--extension-yt-live-membership-name-color': 'rgba(1, 2, 3, 0.5)',
      '--extension-yt-live-chat-font-size': '18px',
      '--extension-yt-live-chat-spacing': '4px',
      '--extension-user-name-display': 'none',
      '--extension-user-icon-display': 'inline',
      '--extension-super-chat-bar-display': 'none',
      'font-family': '"Noto Sans", Roboto, Arial, sans-serif',
    })
    expect(patch.fontFamily).toBe('Noto Sans')

    const reset = compileStylePatch(createProfile({ showUserName: true, showUserIcon: false, showSuperChatBar: true }), {
      membershipDefaultColor: null,
      firefox: false,
    })
    expect(reset.documentProperties).toMatchObject({
      '--extension-user-name-display': 'inline',
      '--extension-user-icon-display': 'none',
      '--extension-super-chat-bar-display': 'block',
      'font-family': 'Roboto, Arial, sans-serif',
    })
    expect(reset.fontFamily).toBeNull()
  })

  it.each([
    { blur: 12, expected: 'blur(12px)' },
    { blur: 0, expected: 'none' },
  ])('compiles blur $blur for both browser modes without filtering chat text', ({ blur, expected }) => {
    const chromePatch = compileStylePatch(createProfile({ blur }), {
      membershipDefaultColor: null,
      firefox: false,
    })
    const firefoxPatch = compileStylePatch(createProfile({ blur }), {
      membershipDefaultColor: null,
      firefox: true,
    })

    for (const patch of [chromePatch, firefoxPatch]) {
      expect(patch.documentProperties['--extension-yt-live-backdrop-filter']).toBe(expected)
      expect(patch.bodyProperties).toEqual({ 'backdrop-filter': expected, '-webkit-backdrop-filter': expected })
    }
  })
})
