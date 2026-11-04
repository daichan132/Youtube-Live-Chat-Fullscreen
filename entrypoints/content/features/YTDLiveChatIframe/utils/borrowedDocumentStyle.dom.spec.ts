import { describe, expect, it } from 'vitest'
import { applyStylePatch } from '@/entrypoints/content/style/applyStylePatch'
import { compileStylePatch } from '@/entrypoints/content/style/compileStylePatch'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { captureBorrowedDocumentStyle, restoreBorrowedDocumentStyle } from './borrowedIframeStyleSnapshot'

describe('borrowed chat document styles', () => {
  it('restores every property written by the real style patch, including its original priority', () => {
    const doc = document.implementation.createHTMLDocument('Native chat')
    const patch = compileStylePatch(
      { ...DEFAULT_CHAT_PROFILE, appearance: { ...DEFAULT_CHAT_PROFILE.appearance, blur: 12, fontFamily: 'Inter' } },
      { membershipDefaultColor: null },
    )
    const original: Array<{ style: CSSStyleDeclaration; property: string; value: string; priority: string }> = []

    for (const [style, properties] of [
      [doc.documentElement.style, patch.documentProperties],
      [doc.body.style, patch.bodyProperties],
    ] as const) {
      for (const [index, property] of Object.keys(properties).entries()) {
        const nativeValue = property === 'font-family' ? 'Native Chat' : property.includes('backdrop-filter') ? 'blur(3px)' : 'native-value'
        const priority = index % 2 === 0 ? 'important' : ''
        style.setProperty(property, nativeValue, priority)
        const value = style.getPropertyValue(property)
        // jsdom does not implement this vendor alias, so it cannot verify its restoration.
        if (property === '-webkit-backdrop-filter' && value === '') continue
        expect(value, `${property}: native value accepted`).not.toBe('')
        expect(style.getPropertyPriority(property), `${property}: native priority accepted`).toBe(priority)
        original.push({ style, property, value, priority })
      }
      style.setProperty('--native-unrelated', 'preserved', 'important')
    }

    const snapshot = captureBorrowedDocumentStyle(doc)
    applyStylePatch(doc, patch)
    for (const { style, property, value } of original) {
      expect(style.getPropertyValue(property), `${property}: patch actually changed native value`).not.toBe(value)
    }
    restoreBorrowedDocumentStyle(doc, snapshot)

    for (const { style, property, value, priority } of original) {
      expect(style.getPropertyValue(property), `${property}: restored value`).toBe(value)
      expect(style.getPropertyPriority(property), `${property}: restored priority`).toBe(priority)
    }
    for (const style of [doc.documentElement.style, doc.body.style]) {
      expect(style.getPropertyValue('--native-unrelated')).toBe('preserved')
      expect(style.getPropertyPriority('--native-unrelated')).toBe('important')
    }
  })
})
