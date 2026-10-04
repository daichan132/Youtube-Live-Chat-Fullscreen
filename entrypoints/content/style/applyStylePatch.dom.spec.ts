import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { applyChatProfileToDocument, applyStylePatch } from './applyStylePatch'
import type { ChatStylePatch } from './compileStylePatch'

const patch = {
  documentProperties: {
    '--test-chat-color': 'rgba(12, 34, 56, 0.8)',
    'font-family': 'Roboto, Arial, sans-serif',
  },
  bodyProperties: {
    opacity: '0.8',
    'backdrop-filter': 'none',
  },
  fontFamily: null,
} satisfies ChatStylePatch

describe('applyStylePatch DOM writes', () => {
  it('avoids repeated property writes for the runtime default profile, including unsupported aliases', () => {
    const doc = document.implementation.createHTMLDocument('')
    const rootWrite = vi.spyOn(doc.documentElement.style, 'setProperty')
    const bodyWrite = vi.spyOn(doc.body.style, 'setProperty')
    const compiled = applyChatProfileToDocument(doc, DEFAULT_CHAT_PROFILE, { firefox: false })
    expect(rootWrite).toHaveBeenCalledTimes(Object.keys(compiled.documentProperties).length)
    expect(bodyWrite).toHaveBeenCalledTimes(Object.keys(compiled.bodyProperties).length)
    rootWrite.mockClear()
    bodyWrite.mockClear()

    applyChatProfileToDocument(doc, DEFAULT_CHAT_PROFILE, { firefox: false })

    expect(rootWrite).not.toHaveBeenCalled()
    expect(bodyWrite).not.toHaveBeenCalled()
  })

  it('uses CSSOM serialization while still repairing changed values and priority', () => {
    const doc = document.implementation.createHTMLDocument('')
    const normalizedPatch = { ...patch, bodyProperties: { opacity: '0.80' } }
    applyStylePatch(doc, normalizedPatch)
    expect(doc.body.style.getPropertyValue('opacity')).toBe('0.8')
    const bodyWrite = vi.spyOn(doc.body.style, 'setProperty')

    applyStylePatch(doc, normalizedPatch)
    expect(bodyWrite).not.toHaveBeenCalled()

    doc.body.style.setProperty('opacity', '0.4')
    bodyWrite.mockClear()
    applyStylePatch(doc, normalizedPatch)
    expect(bodyWrite).toHaveBeenCalledExactlyOnceWith('opacity', '0.80')
    expect(doc.body.style.getPropertyValue('opacity')).toBe('0.8')

    doc.body.style.setProperty('opacity', '0.8', 'important')
    bodyWrite.mockClear()
    applyStylePatch(doc, normalizedPatch)
    expect(bodyWrite).toHaveBeenCalledExactlyOnceWith('opacity', '0.80')
    expect(doc.body.style.getPropertyPriority('opacity')).toBe('')

    bodyWrite.mockClear()
    applyStylePatch(doc, { ...normalizedPatch, bodyProperties: { opacity: '0.60' } })
    expect(bodyWrite).toHaveBeenCalledExactlyOnceWith('opacity', '0.60')
    expect(doc.body.style.getPropertyValue('opacity')).toBe('0.6')
  })

  it('does not write or emit mutations when a newly compiled patch has the same values', () => {
    const doc = document.implementation.createHTMLDocument('')
    const rootWrite = vi.spyOn(doc.documentElement.style, 'setProperty')
    const bodyWrite = vi.spyOn(doc.body.style, 'setProperty')
    applyStylePatch(doc, patch)
    expect(rootWrite).toHaveBeenCalledTimes(2)
    expect(bodyWrite).toHaveBeenCalledTimes(2)
    rootWrite.mockClear()
    bodyWrite.mockClear()

    const observer = new MutationObserver(() => {})
    observer.observe(doc.documentElement, { attributes: true, childList: true, subtree: true })
    try {
      applyStylePatch(doc, {
        ...patch,
        documentProperties: { ...patch.documentProperties },
        bodyProperties: { ...patch.bodyProperties },
      })

      expect(rootWrite).not.toHaveBeenCalled()
      expect(bodyWrite).not.toHaveBeenCalled()
      expect(observer.takeRecords()).toHaveLength(0)
    } finally {
      observer.disconnect()
    }
  })

  it('repairs externally changed and removed properties while preserving unrelated inline styles', () => {
    const doc = document.implementation.createHTMLDocument('')
    applyStylePatch(doc, patch)
    doc.documentElement.style.setProperty('--test-chat-color', 'red')
    doc.documentElement.style.setProperty('--youtube-owned', 'unchanged')
    doc.body.style.removeProperty('opacity')
    const rootWrite = vi.spyOn(doc.documentElement.style, 'setProperty')
    const bodyWrite = vi.spyOn(doc.body.style, 'setProperty')

    applyStylePatch(doc, patch)

    expect(rootWrite).toHaveBeenCalledExactlyOnceWith('--test-chat-color', patch.documentProperties['--test-chat-color'])
    expect(bodyWrite).toHaveBeenCalledExactlyOnceWith('opacity', '0.8')
    expect(doc.documentElement.style.getPropertyValue('--test-chat-color')).toBe(patch.documentProperties['--test-chat-color'])
    expect(doc.documentElement.style.getPropertyValue('--youtube-owned')).toBe('unchanged')
    expect(doc.body.style.getPropertyValue('opacity')).toBe('0.8')
  })

  it('removes an external important priority even when the property value is unchanged', () => {
    const doc = document.implementation.createHTMLDocument('')
    applyStylePatch(doc, patch)
    doc.documentElement.style.setProperty('--test-chat-color', patch.documentProperties['--test-chat-color'], 'important')
    doc.body.style.setProperty('opacity', '0.8', 'important')
    const rootWrite = vi.spyOn(doc.documentElement.style, 'setProperty')
    const bodyWrite = vi.spyOn(doc.body.style, 'setProperty')

    applyStylePatch(doc, patch)

    expect(rootWrite).toHaveBeenCalledExactlyOnceWith('--test-chat-color', patch.documentProperties['--test-chat-color'])
    expect(bodyWrite).toHaveBeenCalledExactlyOnceWith('opacity', '0.8')
    expect(doc.documentElement.style.getPropertyPriority('--test-chat-color')).toBe('')
    expect(doc.body.style.getPropertyPriority('opacity')).toBe('')
  })

  it('applies the current patch after YouTube replaces the body', () => {
    const doc = document.implementation.createHTMLDocument('')
    applyStylePatch(doc, patch)
    const nextBody = doc.createElement('body')
    doc.body.replaceWith(nextBody)
    const rootWrite = vi.spyOn(doc.documentElement.style, 'setProperty')
    const bodyWrite = vi.spyOn(nextBody.style, 'setProperty')

    applyStylePatch(doc, patch)

    expect(rootWrite).not.toHaveBeenCalled()
    expect(bodyWrite).toHaveBeenCalledTimes(2)
    expect(nextBody.style.getPropertyValue('opacity')).toBe('0.8')
    expect(nextBody.style.getPropertyValue('backdrop-filter')).toBe('none')
  })
})
