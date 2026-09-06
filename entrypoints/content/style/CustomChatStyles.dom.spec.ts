import { describe, expect, it, vi } from 'vitest'
import { CustomChatStyles } from './CustomChatStyles'

const makeDocument = () => document.implementation.createHTMLDocument('Chat')
const userStyle = (doc: Document) => doc.querySelector<HTMLStyleElement>('[data-ylc-user-css]')

describe('CustomChatStyles document ownership', () => {
  it('reuses its node and does not change identical text', () => {
    const doc = makeDocument()
    const styles = new CustomChatStyles()
    styles.update(doc, '#message { color: red; }')
    const node = userStyle(doc)
    const writes = vi.spyOn(node as HTMLStyleElement, 'textContent', 'set')
    styles.update(doc, '#message { color: red; }')
    expect(writes).not.toHaveBeenCalled()
    styles.update(doc, '#message { color: blue; }')
    expect(userStyle(doc)).toBe(node)
    expect(doc.querySelectorAll('[data-ylc-user-css]')).toHaveLength(1)
    expect(node?.textContent).toContain('blue')
    styles.release()
  })

  it('removes the previous document node and releases repeatedly', () => {
    const before = makeDocument()
    const after = makeDocument()
    const styles = new CustomChatStyles()
    styles.update(before, 'body { color: red; }')
    styles.update(after, 'body { color: blue; }')
    expect(userStyle(before)).toBeNull()
    expect(userStyle(after)?.textContent).toContain('blue')
    styles.release()
    styles.release()
    expect(userStyle(after)).toBeNull()
  })

  it('never installs old content when changing documents and disabling', () => {
    const before = makeDocument()
    const after = makeDocument()
    const styles = new CustomChatStyles()
    styles.update(before, 'body { color: red; }')
    const append = vi.spyOn(after.head, 'appendChild')
    styles.update(after, '')
    expect(append).not.toHaveBeenCalled()
    expect(userStyle(before)).toBeNull()
    expect(userStyle(after)).toBeNull()
  })

  it('removes its node even after head is removed and the style moved to body', () => {
    const doc = makeDocument()
    const styles = new CustomChatStyles()
    styles.update(doc, 'body { color: red; }')
    const node = userStyle(doc)
    if (!node) throw new Error('Expected owned style')
    doc.body.appendChild(node)
    doc.head.remove()
    styles.update(doc, '')
    expect(node.isConnected).toBe(false)
  })

  it('releases an unavailable document without removing foreign styles', () => {
    const doc = makeDocument()
    const foreign = doc.createElement('style')
    foreign.setAttribute('data-ylc-user-css', 'true')
    doc.head.appendChild(foreign)
    const styles = new CustomChatStyles()
    styles.update(doc, 'body { color: red; }')
    styles.update(null, '')
    expect(foreign.parentNode).toBe(doc.head)
    expect(doc.querySelectorAll('[data-ylc-user-css]')).toHaveLength(1)
  })

  it('treats HTML-looking input as CSS text rather than markup', () => {
    const doc = makeDocument()
    const styles = new CustomChatStyles()
    const source = '</style><script>window.bad = true</script>'
    styles.update(doc, source)
    expect(userStyle(doc)?.textContent).toBe(source)
    expect(doc.querySelector('script')).toBeNull()
    styles.release()
  })
})
