// Browser URLs in the design preview point to Storybook's public assets.
export const browser = {
  runtime: { getURL: (path: string) => new URL(path, window.location.origin).href },
  i18n: { getUILanguage: () => navigator.language },
}
