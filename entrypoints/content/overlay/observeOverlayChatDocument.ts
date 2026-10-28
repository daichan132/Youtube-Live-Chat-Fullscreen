import { isAccessibleNode } from '../chat/shared/isAccessibleNode'

type OverlayScope = Element | Document | ShadowRoot

/** Rebind when the borrowed chat iframe or its accessible document changes. */
export const observeOverlayChatDocument = (scope: OverlayScope, attach: (frame: HTMLIFrameElement, document: Document) => () => void) => {
  let frame: HTMLIFrameElement | null = null
  let chatDocument: Document | null = null
  let release: (() => void) | undefined

  const bind = () => {
    const nextFrame = scope.querySelector<HTMLIFrameElement>('iframe[data-ylc-chat]')
    let nextDocument: Document | null = null
    try {
      nextDocument = nextFrame?.contentDocument ?? null
    } catch {
      // Native navigation can temporarily make the borrowed document inaccessible.
    }
    if (!isAccessibleNode(nextDocument)) nextDocument = null
    if (nextFrame === frame && nextDocument === chatDocument) return
    if (isAccessibleNode(chatDocument)) release?.()
    release = undefined
    frame = nextFrame
    chatDocument = nextDocument
    if (frame && chatDocument) release = attach(frame, chatDocument)
  }

  scope.addEventListener('load', bind, true)
  const observer = new MutationObserver(bind)
  observer.observe(scope, { childList: true, subtree: true })
  bind()
  return () => {
    scope.removeEventListener('load', bind, true)
    observer.disconnect()
    if (isAccessibleNode(chatDocument)) release?.()
  }
}
