export const toGoogleFontFamilyParam = (fontFamily: string) => encodeURIComponent(fontFamily.trim()).replace(/%20/g, '+')

export const toQuotedFontFamily = (fontFamily: string) => `"${fontFamily.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
