export interface RGBColor {
  r: number
  g: number
  b: number
  a?: number
}

export interface sizeType {
  width: number
  height: number
}

export interface YLCStyleType {
  bgColor: RGBColor
  fontColor: RGBColor
  fontFamily: string
  fontSize: number
  blur: number
  space: number
  alwaysOnDisplay: boolean
  chatOnlyDisplay: boolean
  userNameDisplay: boolean
  userIconDisplay: boolean
  superChatBarDisplay: boolean
}

export interface YLCStyleUpdateType {
  bgColor?: RGBColor
  fontColor?: RGBColor
  fontFamily?: string
  fontSize?: number
  blur?: number
  space?: number
  alwaysOnDisplay?: boolean
  chatOnlyDisplay?: boolean
  userNameDisplay?: boolean
  userIconDisplay?: boolean
  superChatBarDisplay?: boolean
}
