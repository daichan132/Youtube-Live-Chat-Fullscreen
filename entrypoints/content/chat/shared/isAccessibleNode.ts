/** Firefox revokes wrappers when an iframe document is destroyed. Detached, live nodes remain accessible. */
export const isAccessibleNode = <T extends Node>(node: T | null | undefined): node is T => {
  if (!node) return false
  try {
    return typeof node.nodeType === 'number'
  } catch {
    return false
  }
}
