import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MEMBERSHIP_NAME_COLOR,
  ylcCompactSetting,
  ylcDarkSetting,
  ylcInitSetting,
  ylcNeonSetting,
  ylcReadableSetting,
  ylcSimpleSetting,
  ylcTransparentSetting,
} from './YLCInitSetting'

describe('YLC settings presets', () => {
  it('defines defaults for the base preset', () => {
    expect(ylcInitSetting.bgColor).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(ylcInitSetting.membershipNameColor).toEqual(DEFAULT_MEMBERSHIP_NAME_COLOR)
    expect(ylcInitSetting.alwaysOnDisplay).toBe(true)
    expect(ylcInitSetting.chatOnlyDisplay).toBe(false)
  })

  it('defines transparent preset characteristics', () => {
    expect(ylcTransparentSetting.bgColor.a).toBe(0.22)
    expect(ylcTransparentSetting.fontColor).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(ylcTransparentSetting.blur).toBe(16)
    expect(ylcTransparentSetting.space).toBe(6)
  })

  it('defines simple preset characteristics', () => {
    expect(ylcSimpleSetting.chatOnlyDisplay).toBe(true)
    expect(ylcSimpleSetting.userNameDisplay).toBe(false)
    expect(ylcSimpleSetting.userIconDisplay).toBe(false)
    expect(ylcSimpleSetting.superChatBarDisplay).toBe(false)
  })

  it('defines additional default preset characteristics', () => {
    expect(ylcDarkSetting.bgColor).toEqual({ r: 2, g: 6, b: 23, a: 0.86 })
    expect(ylcDarkSetting.fontColor).toEqual({ r: 226, g: 232, b: 240, a: 1 })
    expect(ylcReadableSetting.fontFamily).toBe('BIZ UDPGothic')
    expect(ylcReadableSetting.fontSize).toBe(18)
    expect(ylcReadableSetting.userNameDisplay).toBe(false)
    expect(ylcCompactSetting.bgColor.a).toBe(0.72)
    expect(ylcCompactSetting.chatOnlyDisplay).toBe(true)
    expect(ylcCompactSetting.userIconDisplay).toBe(false)
    expect(ylcNeonSetting.fontColor).toEqual({ r: 217, g: 249, b: 157, a: 1 })
    expect(ylcNeonSetting.blur).toBe(14)
  })
})
