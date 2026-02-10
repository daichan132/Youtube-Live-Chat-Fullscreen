import { ALLOWED_FONT_FAMILIES } from '@/shared/utils/fontFamilyPolicy'

export type FontFamilyOption = {
  value: string
  label: string
  featured?: boolean
}

export const DEFAULT_FONT_OPTION: FontFamilyOption = {
  value: '',
  label: '',
}

export const FEATURED_FONT_VALUES = [
  'Roboto',
  'Noto Sans',
  'Noto Sans JP',
  'Zen Maru Gothic',
  'M PLUS 1p',
  'BIZ UDPGothic',
  'Open Sans',
  'Montserrat',
  'Poppins',
  'Inter',
] as const

const featuredFontFamilySet = new Set<string>(FEATURED_FONT_VALUES)

export const FONT_FAMILY_OPTIONS: FontFamilyOption[] = ALLOWED_FONT_FAMILIES.map(fontFamily => ({
  value: fontFamily,
  label: fontFamily,
  featured: featuredFontFamilySet.has(fontFamily),
}))
