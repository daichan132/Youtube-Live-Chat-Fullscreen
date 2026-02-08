import { MODAL_ROOT_ID, SHADOW_HOST_ID } from '@/entrypoints/content/constants/domIds'

let cachedModalRoot: HTMLElement | null = null

export const getModalParentElement = (): HTMLElement => {
  const host = document.getElementById(SHADOW_HOST_ID)
  const shadowRoot = host?.shadowRoot

  if (shadowRoot) {
    let modalRoot = shadowRoot.querySelector<HTMLElement>(`#${MODAL_ROOT_ID}`)
    if (!modalRoot) {
      modalRoot = document.createElement('div')
      modalRoot.id = MODAL_ROOT_ID
      // モーダルをクリック可能にする（親要素がpointer-events: noneのため）
      modalRoot.style.pointerEvents = 'auto'
      shadowRoot.appendChild(modalRoot)
    }
    cachedModalRoot = modalRoot
    return modalRoot
  }

  return cachedModalRoot ?? document.body
}
