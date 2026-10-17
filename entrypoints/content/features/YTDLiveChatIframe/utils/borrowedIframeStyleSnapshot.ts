import { YLC_DOCUMENT_STYLE_PROPERTIES } from '@/entrypoints/content/hooks/ylcStyleChange/ylcStyleConstants'
import { CUSTOM_FONT_STYLE_ID } from '../constants/styleContract'

type InlineStylePropertySnapshot = { value: string; priority: string }

export type BorrowedIframeStyleSnapshot = {
  properties: Map<string, InlineStylePropertySnapshot>
  allowTransparency: string | null
}

type CustomFontStyleSnapshot = {
  element: Element | null
  parent: ParentNode | null
  nextSibling: ChildNode | null
  textContent: string | null
}

export type BorrowedDocumentStyleSnapshot = {
  documentElementStyles: Map<string, InlineStylePropertySnapshot>
  bodyBackdropFilter: InlineStylePropertySnapshot
  bodyWebkitBackdropFilter: InlineStylePropertySnapshot
  customFontStyle: CustomFontStyleSnapshot
}

// Capture longhands: shorthand values can be empty when their components
// have different priorities, and assigning a shorthand discards those priorities.
const BORROWED_IFRAME_STYLE_PROPERTIES = [
  'width',
  'height',
  'max-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'outline-color',
  'outline-style',
  'outline-width',
  'position',
  'z-index',
  'background-color',
  'filter',
  '-webkit-filter',
] as const

const captureInlineStyleProperty = (style: CSSStyleDeclaration, property: string): InlineStylePropertySnapshot => ({
  value: style.getPropertyValue(property),
  priority: style.getPropertyPriority(property),
})

const restoreInlineStyleProperty = (style: CSSStyleDeclaration, property: string, snapshot: InlineStylePropertySnapshot) => {
  if (snapshot.value) style.setProperty(property, snapshot.value, snapshot.priority)
  else style.removeProperty(property)
}

export const captureBorrowedDocumentStyle = (doc: Document): BorrowedDocumentStyleSnapshot => {
  const customFontStyle = doc.head.querySelector(`#${CUSTOM_FONT_STYLE_ID}`)
  return {
    documentElementStyles: new Map(
      YLC_DOCUMENT_STYLE_PROPERTIES.map(property => [property, captureInlineStyleProperty(doc.documentElement.style, property)]),
    ),
    bodyBackdropFilter: captureInlineStyleProperty(doc.body.style, 'backdrop-filter'),
    bodyWebkitBackdropFilter: captureInlineStyleProperty(doc.body.style, '-webkit-backdrop-filter'),
    customFontStyle: {
      element: customFontStyle,
      parent: customFontStyle?.parentNode ?? null,
      nextSibling: customFontStyle?.nextSibling ?? null,
      textContent: customFontStyle?.textContent ?? null,
    },
  }
}

const restoreCustomFontStyle = (doc: Document, snapshot: CustomFontStyleSnapshot) => {
  const current = doc.head?.querySelector(`#${CUSTOM_FONT_STYLE_ID}`) ?? null
  if (!snapshot.element) {
    current?.remove()
    return
  }
  if (current && current !== snapshot.element) current.remove()
  snapshot.element.textContent = snapshot.textContent
  if (snapshot.element.ownerDocument !== doc || snapshot.element.isConnected) return
  const parent = snapshot.parent && (snapshot.parent as Node).ownerDocument === doc ? snapshot.parent : doc.head
  if (!parent) return
  parent.insertBefore(snapshot.element, snapshot.nextSibling?.parentNode === parent ? snapshot.nextSibling : null)
}

export const restoreBorrowedDocumentStyle = (doc: Document, snapshot: BorrowedDocumentStyleSnapshot) => {
  for (const [property, value] of snapshot.documentElementStyles) {
    restoreInlineStyleProperty(doc.documentElement.style, property, value)
  }
  restoreInlineStyleProperty(doc.body.style, 'backdrop-filter', snapshot.bodyBackdropFilter)
  restoreInlineStyleProperty(doc.body.style, '-webkit-backdrop-filter', snapshot.bodyWebkitBackdropFilter)
  restoreCustomFontStyle(doc, snapshot.customFontStyle)
}

export const captureBorrowedIframeStyle = (iframe: HTMLIFrameElement): BorrowedIframeStyleSnapshot => {
  const properties = new Map<string, InlineStylePropertySnapshot>(
    BORROWED_IFRAME_STYLE_PROPERTIES.map(property => [property, captureInlineStyleProperty(iframe.style, property)]),
  )
  for (const shorthand of ['border-style', 'border-width', 'outline']) {
    const snapshot = captureInlineStyleProperty(iframe.style, shorthand)
    const components = BORROWED_IFRAME_STYLE_PROPERTIES.filter(property =>
      shorthand === 'outline' ? property.startsWith('outline-') : property.startsWith('border-') && property.endsWith(shorthand.slice(6)),
    )
    // Preserve the original shorthand when it represents every component.
    // Mixed priorities need the individual declarations instead.
    if (
      !snapshot.value ||
      components.some(property => properties.get(property)?.value && properties.get(property)?.priority !== snapshot.priority)
    )
      continue
    for (const property of components) properties.delete(property)
    properties.set(shorthand, snapshot)
  }
  return { properties, allowTransparency: iframe.getAttribute('allowtransparency') }
}

export const restoreBorrowedIframeStyle = (iframe: HTMLIFrameElement, style: BorrowedIframeStyleSnapshot) => {
  iframe.style.removeProperty('border-style')
  iframe.style.removeProperty('border-width')
  iframe.style.removeProperty('outline')
  for (const [property, snapshot] of style.properties) restoreInlineStyleProperty(iframe.style, property, snapshot)
  if (style.allowTransparency === null) iframe.removeAttribute('allowtransparency')
  else iframe.setAttribute('allowtransparency', style.allowTransparency)
}
