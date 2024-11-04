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
  reactionButtonDisplay: true,
  superChatBarDisplay: true,
}

export const ylcTransparentSetting: YLCStyleType = {
  bgColor: { r: 0, g: 0, b: 0, a: 0.3 },
  fontColor: { r: 255, g: 255, b: 255, a: 1 },
  fontFamily: 'Zen Maru Gothic',
  fontSize: 13,
  blur: 10,
  space: 0,
  alwaysOnDisplay: true,
  chatOnlyDisplay: false,
  userNameDisplay: true,
  userIconDisplay: true,
  reactionButtonDisplay: true,
  superChatBarDisplay: true,
}

export const ylcSimpleSetting: YLCStyleType = {
  bgColor: { r: 255, g: 255, b: 255, a: 1 },
  fontColor: { r: 0, g: 0, b: 0, a: 1 },
  fontFamily: 'Zen Maru Gothic',
  fontSize: 13,
  blur: 0,
  space: 10,
  alwaysOnDisplay: true,
  chatOnlyDisplay: true,
  userNameDisplay: false,
  userIconDisplay: true,
  reactionButtonDisplay: false,
  superChatBarDisplay: false,
}
