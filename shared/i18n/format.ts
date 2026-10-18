/**
 * Fills `{placeholder}` slots in a translated string.
 *
 * Translations are free to reorder the slots, repeat one, or drop the ones a language does not need,
 * so substitution is by name rather than by position. Values remain literal text, even when they
 * contain replacement syntax or another placeholder.
 */
export const formatMessage = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{([^{}]+)\}/g, (placeholder, name: string) => (Object.hasOwn(values, name) ? String(values[name]) : placeholder))
