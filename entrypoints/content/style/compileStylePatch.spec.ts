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
  it('keeps YouTube public backgrounds transparent while compiling internal surfaces', () => {
    const patch = compileStylePatch(
      createProfile({
        backgroundColor: { r: 100, g: 120, b: 140, a: 0.8 },
      }),
      { membershipDefaultColor: null, firefox: false },
    )

    expect(patch.documentProperties['--yt-live-chat-background-color']).toBe('transparent')
    expect(patch.documentProperties['--yt-live-chat-header-background-color']).toBe('transparent')
    expect(patch.documentProperties['--extension-yt-live-menu-background-color']).toBe('rgba(100, 120, 140, 0.856)')
    expect(patch.documentProperties['--extension-yt-live-panel-background-color']).toBe('rgba(100, 120, 140, 0.224)')
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
      '--extension-yt-live-membership-name-color': 'rgba(1, 2, 3, 0.5)',
      '--extension-yt-live-chat-font-size': '18px',
      '--extension-yt-live-chat-spacing': '4px',
      '--extension-user-name-display': 'none',
      '--extension-user-icon-display': 'inline',
      '--extension-super-chat-bar-display': 'none',
      'font-family': '"Noto Sans", Roboto, Arial, sans-serif',
    })
    expect(patch.fontFamily).toBe('Noto Sans')
  })

  it('applies backdrop blur inside the iframe document on Chrome and Firefox', () => {
    const chromePatch = compileStylePatch(createProfile({ blur: 12 }), {
      membershipDefaultColor: null,
      firefox: false,
    })
    const firefoxPatch = compileStylePatch(createProfile({ blur: 12 }), {
      membershipDefaultColor: null,
      firefox: true,
    })

    expect(chromePatch.documentProperties['--extension-yt-live-backdrop-filter']).toBe('blur(12px)')
    expect(firefoxPatch.documentProperties['--extension-yt-live-backdrop-filter']).toBe('blur(12px)')
    expect(chromePatch.bodyProperties['backdrop-filter']).toBe('blur(12px)')
    expect(firefoxPatch.bodyProperties['backdrop-filter']).toBe('blur(12px)')
  })
})
