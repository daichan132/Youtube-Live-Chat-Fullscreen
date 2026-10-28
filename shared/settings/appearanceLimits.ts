// These bounds apply both to interactive controls and persisted profiles.
export const APPEARANCE_NUMBER_LIMITS = {
  fontSize: { min: 10, max: 40 },
  blur: { min: 0, max: 20 },
  spacing: { min: 0, max: 40 },
} as const

export type AppearanceNumberKey = keyof typeof APPEARANCE_NUMBER_LIMITS
