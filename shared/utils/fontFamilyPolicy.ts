const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

export const ALLOWED_FONT_FAMILIES = [
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

const canonicalFontFamilyByKey = new Map(
  ALLOWED_FONT_FAMILIES.map(fontFamily => [collapseWhitespace(fontFamily).toLowerCase(), fontFamily] as const),
)

export const normalizeFontFamily = (input: unknown): string => {
  if (typeof input !== 'string') return ''

  const normalizedInput = collapseWhitespace(input)
  if (!normalizedInput) return ''

  return canonicalFontFamilyByKey.get(normalizedInput.toLowerCase()) ?? ''
}

export const isAllowedFontFamily = (input: unknown): boolean => normalizeFontFamily(input) !== ''
