const NON_TEXT_INPUT_TYPES = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'])

export const isTextInputType = (type: string) => !NON_TEXT_INPUT_TYPES.has(type)
