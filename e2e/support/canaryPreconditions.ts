/**
 * Canary projects may skip when YouTube does not expose the required external
 * state. Keep that best-effort boundary outside assertion-oriented page objects.
 */
export const hasCanaryPrecondition = async (assertion: () => Promise<void>): Promise<boolean> => {
  try {
    await assertion()
    return true
  } catch {
    return false
  }
}
