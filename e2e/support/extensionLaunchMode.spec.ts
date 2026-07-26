import { describe, expect, it } from 'vitest'
import { resolveExtensionLaunchMode } from './extensionLaunchMode'

describe('resolveExtensionLaunchMode', () => {
  it('uses new headless Chromium by default', () => {
    const options = resolveExtensionLaunchMode({}, { browserVersion: '149.0.7827.55', platform: 'darwin' })

    expect(options).toEqual({
      headless: true,
      channel: 'chromium',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    })
    expect(options.userAgent).not.toContain('HeadlessChrome')
  })

  it('allows an explicit headed override for visual debugging', () => {
    expect(resolveExtensionLaunchMode({ YLC_E2E_HEADED: '1' }, { browserVersion: '149.0.7827.55' })).toEqual({ headless: false })
  })

  it.each(['', '0', 'true'])('does not enable headed mode for %j', value => {
    const options = resolveExtensionLaunchMode({ YLC_E2E_HEADED: value }, { browserVersion: '149.0.7827.55' })

    expect(options.headless).toBe(true)
    expect(options.channel).toBe('chromium')
    expect(options.userAgent).not.toContain('HeadlessChrome')
  })
})
