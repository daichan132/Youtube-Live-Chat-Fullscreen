/** Own one stylesheet. The runtime owns the requested CSS and the active lease. */
export class CustomChatStyles {
  private document: Document | null = null
  private element: HTMLStyleElement | null = null

  update(document: Document | null, css: string) {
    if (this.document !== document) {
      this.release()
      this.document = document
    }
    // Cleanup precedes readiness checks: the owned node may have been moved
    // to body before the document lost its head.
    if (!document?.head || !css) {
      this.element?.remove()
      this.element = null
      return
    }
    if (!this.element) {
      this.element = document.createElement('style')
      this.element.setAttribute('data-ylc-user-css', 'true')
    }
    // Set the new content before attaching to a new Document. No previously
    // requested CSS is briefly installed while a stop/replacement is applied.
    if (this.element.textContent !== css) this.element.textContent = css
    if (this.element.parentNode !== document.head) document.head.appendChild(this.element)
  }

  release() {
    this.element?.remove()
    this.element = null
    this.document = null
  }
}
