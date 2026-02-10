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

const FONT_FAMILY_VALUES = [
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
  'Lato',
  'Nunito',
  'Work Sans',
  'Source Sans 3',
  'IBM Plex Sans',
  'Fira Sans',
  'Ubuntu',
  'Raleway',
  'Quicksand',
  'Cabin',
  'Barlow',
  'Archivo',
  'Oswald',
  'Bebas Neue',
  'Anton',
  'Merriweather',
  'Roboto Slab',
  'Noto Serif',
  'Noto Serif JP',
  'Playfair Display',
  'Shippori Mincho',
  'Zen Old Mincho',
  'BIZ UDMincho',
  'Sawarabi Mincho',
  'Hina Mincho',
  'M PLUS Rounded 1c',
  'Zen Kaku Gothic New',
  'Klee One',
  'Kosugi Maru',
  'Sawarabi Gothic',
  'DotGothic16',
  'RocknRoll One',
  'Mochiy Pop One',
  'Inconsolata',
  'Source Code Pro',
  'JetBrains Mono',
  'Fira Code',
  'Dancing Script',
  'Lobster',
  'Pacifico',
] as const

const featuredFontFamilySet = new Set<string>(FEATURED_FONT_VALUES)

export const FONT_FAMILY_OPTIONS: FontFamilyOption[] = FONT_FAMILY_VALUES.map(fontFamily => ({
  value: fontFamily,
  label: fontFamily,
  featured: featuredFontFamilySet.has(fontFamily),
}))
