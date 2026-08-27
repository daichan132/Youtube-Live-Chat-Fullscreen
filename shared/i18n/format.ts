/**
 * Fills `{placeholder}` slots in a translated string.
 *
 * Translations are free to reorder the slots, repeat one, or drop the ones a language does not need,
 * so substitution is by name rather than by position.
 */
export const formatMessage = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
