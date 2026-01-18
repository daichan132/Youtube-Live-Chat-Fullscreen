const SHADOW_HOST_ID = 'shadow-root-live-chat'
const MODAL_ROOT_ID = 'shadow-root-live-chat-modal-root'

let cachedModalRoot: HTMLElement | null = null

export const getModalParentElement = (): HTMLElement => {
  const host = document.getElementById(SHADOW_HOST_ID)
  const shadowRoot = host?.shadowRoot

  if (shadowRoot) {
    let modalRoot = shadowRoot.querySelector<HTMLElement>(`#${MODAL_ROOT_ID}`)
    if (!modalRoot) {
      modalRoot = document.createElement('div')
      modalRoot.id = MODAL_ROOT_ID
      shadowRoot.appendChild(modalRoot)
    }
    cachedModalRoot = modalRoot
    return modalRoot
  }

  return cachedModalRoot ?? document.body
}
