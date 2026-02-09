import { describe, expect, it } from 'vitest'
import { ylcInitSetting, ylcSimpleSetting, ylcTransparentSetting } from './YLCInitSetting'

describe('YLC settings presets', () => {
  it('defines defaults for the base preset', () => {
    expect(ylcInitSetting.bgColor).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(ylcInitSetting.alwaysOnDisplay).toBe(true)
    expect(ylcInitSetting.chatOnlyDisplay).toBe(false)
  })

  it('defines transparent preset characteristics', () => {
    expect(ylcTransparentSetting.bgColor.a).toBe(0.3)
    expect(ylcTransparentSetting.fontColor).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(ylcTransparentSetting.blur).toBe(10)
  })

  it('defines simple preset characteristics', () => {
    expect(ylcSimpleSetting.chatOnlyDisplay).toBe(true)
    expect(ylcSimpleSetting.userNameDisplay).toBe(false)
    expect(ylcSimpleSetting.superChatBarDisplay).toBe(false)
  })
})
