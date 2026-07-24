import type { RGBColor, YLCStyleType, YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'

export const YLC_STYLE_KEYS = [
  'bgColor',
  'fontColor',
  'membershipNameColor',
  'fontFamily',
  'fontSize',
  'blur',
  'space',
  'alwaysOnDisplay',
  'chatOnlyDisplay',
  'userNameDisplay',
  'userIconDisplay',
  'superChatBarDisplay',
] as const satisfies readonly (keyof YLCStyleType)[]

const cloneColor = (color: RGBColor): RGBColor => ({ ...color })

export const getYLCStyleSnapshot = (style: YLCStyleType): YLCStyleType => ({
  bgColor: cloneColor(style.bgColor),
  fontColor: cloneColor(style.fontColor),
  membershipNameColor: cloneColor(style.membershipNameColor),
  fontFamily: style.fontFamily,
  fontSize: style.fontSize,
  blur: style.blur,
  space: style.space,
  alwaysOnDisplay: style.alwaysOnDisplay,
  chatOnlyDisplay: style.chatOnlyDisplay,
  userNameDisplay: style.userNameDisplay,
  userIconDisplay: style.userIconDisplay,
  superChatBarDisplay: style.superChatBarDisplay,
})

const areColorsEqual = (left: RGBColor, right: RGBColor) =>
  left.r === right.r && left.g === right.g && left.b === right.b && left.a === right.a

const areStyleValuesEqual = <Key extends keyof YLCStyleType>(key: Key, left: YLCStyleType[Key], right: YLCStyleType[Key]) => {
  if (key === 'bgColor' || key === 'fontColor' || key === 'membershipNameColor') {
    return areColorsEqual(left as RGBColor, right as RGBColor)
  }
  return left === right
}

export const areYLCStylesEqual = (left: YLCStyleType, right: YLCStyleType) =>
  YLC_STYLE_KEYS.every(key => areStyleValuesEqual(key, left[key], right[key]))

export const getYLCStyleDiff = (previous: YLCStyleType, next: YLCStyleType): YLCStyleUpdateType => {
  const diff: YLCStyleUpdateType = {}

  for (const key of YLC_STYLE_KEYS) {
    if (areStyleValuesEqual(key, previous[key], next[key])) continue
    Object.assign(diff, { [key]: next[key] })
  }

  return diff
}
