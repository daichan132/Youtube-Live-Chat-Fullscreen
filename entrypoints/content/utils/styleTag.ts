const findStyleTag = (head: HTMLHeadElement, id: string) => {
  const element = head.ownerDocument.getElementById(id)
  return element instanceof HTMLStyleElement ? element : null
}

export const upsertStyleTag = (
  head: HTMLHeadElement | null | undefined,
  id: string,
  cssText: string,
) => {
  if (!head) return

  const existing = findStyleTag(head, id)
  if (existing) {
    existing.textContent = cssText
    return
  }

  const style = head.ownerDocument.createElement('style')
  style.id = id
  style.textContent = cssText
  head.appendChild(style)
}

export const removeStyleTag = (head: HTMLHeadElement | null | undefined, id: string) => {
  if (!head) return

  findStyleTag(head, id)?.remove()
}
