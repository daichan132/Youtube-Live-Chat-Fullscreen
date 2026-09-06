/** Own exactly one user stylesheet in the currently leased chat Document. */
export class CustomChatStyles {
  private document: Document | null = null
  private element: HTMLStyleElement | null = null
  private css = ''

  setCss(css: string) {
    const changed = this.css !== css
    this.css = css
    this.render()
    return changed
  }

  bind(document: Document) {
    if (this.document !== document) {
      this.release()
      this.document = document
    }
    this.render()
  }

  release() {
    this.element?.remove()
    this.element = null
    this.document = null
  }

  private render() {
    if (!this.document?.head) return
    if (!this.css) {
      this.element?.remove()
      this.element = null
      return
    }
    if (!this.element) {
      this.element = this.document.createElement('style')
      this.element.setAttribute('data-ylc-user-css', 'true')
    }
    // Never interpolate as HTML, concatenate with built-in CSS, or rewrite
    // selectors/@rules. CSP and normal browser CSS error recovery still apply.
    if (this.element.textContent !== this.css) this.element.textContent = this.css
    if (this.element.parentNode !== this.document.head) this.document.head.appendChild(this.element)
  }
}
