import type { YLCStyleType } from '../types/ytdLiveChatType'

export const ylcInitSetting: YLCStyleType = {
  bgColor: { r: 255, g: 255, b: 255, a: 1 },
  fontColor: { r: 0, g: 0, b: 0, a: 1 },
  fontFamily: '',
  fontSize: 13,
  blur: 0,
  space: 0,
  alwaysOnDisplay: true,
  chatOnlyDisplay: false,
  userNameDisplay: true,
  userIconDisplay: true,
  superChatBarDisplay: true,
}

export const ylcTransparentSetting: YLCStyleType = {
  bgColor: { r: 0, g: 0, b: 0, a: 0.22 },
  fontColor: { r: 255, g: 255, b: 255, a: 1 },
  fontFamily: 'Zen Maru Gothic',
  fontSize: 14,
  blur: 16,
  space: 6,
  alwaysOnDisplay: true,
  chatOnlyDisplay: false,
  userNameDisplay: true,
  userIconDisplay: true,
  superChatBarDisplay: true,
}

export const ylcSimpleSetting: YLCStyleType = {
  bgColor: { r: 255, g: 255, b: 255, a: 0.74 },
  fontColor: { r: 17, g: 24, b: 39, a: 1 },
  fontFamily: 'Noto Sans JP',
  fontSize: 13,
  blur: 0,
  space: 8,
  alwaysOnDisplay: true,
  chatOnlyDisplay: true,
  userNameDisplay: false,
  userIconDisplay: false,
  superChatBarDisplay: false,
}

export const ylcDarkSetting: YLCStyleType = {
  bgColor: { r: 2, g: 6, b: 23, a: 0.86 },
  fontColor: { r: 226, g: 232, b: 240, a: 1 },
  fontFamily: 'Inter',
  fontSize: 14,
  blur: 4,
  space: 2,
  alwaysOnDisplay: true,
  chatOnlyDisplay: false,
  userNameDisplay: true,
  userIconDisplay: true,
  superChatBarDisplay: true,
}

export const ylcReadableSetting: YLCStyleType = {
  bgColor: { r: 255, g: 255, b: 255, a: 0.96 },
  fontColor: { r: 0, g: 0, b: 0, a: 1 },
  fontFamily: 'BIZ UDPGothic',
  fontSize: 18,
  blur: 0,
  space: 6,
  alwaysOnDisplay: true,
  chatOnlyDisplay: true,
  userNameDisplay: false,
  userIconDisplay: false,
  superChatBarDisplay: false,
}

export const ylcCompactSetting: YLCStyleType = {
  bgColor: { r: 17, g: 24, b: 39, a: 0.72 },
  fontColor: { r: 243, g: 244, b: 246, a: 1 },
  fontFamily: 'Noto Sans',
  fontSize: 12,
  blur: 2,
  space: 0,
  alwaysOnDisplay: true,
  chatOnlyDisplay: true,
  userNameDisplay: true,
  userIconDisplay: false,
  superChatBarDisplay: false,
}

export const ylcNeonSetting: YLCStyleType = {
  bgColor: { r: 30, g: 16, b: 64, a: 0.58 },
  fontColor: { r: 217, g: 249, b: 157, a: 1 },
  fontFamily: 'M PLUS Rounded 1c',
  fontSize: 14,
  blur: 14,
  space: 8,
  alwaysOnDisplay: true,
  chatOnlyDisplay: false,
  userNameDisplay: true,
  userIconDisplay: true,
  superChatBarDisplay: true,
}
