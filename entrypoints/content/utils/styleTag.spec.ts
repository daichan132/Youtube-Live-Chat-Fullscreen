import { beforeEach, describe, expect, it } from 'vitest'
import { removeStyleTag, upsertStyleTag } from './styleTag'

const STYLE_ID = 'test-style-tag'

beforeEach(() => {
  document.head.innerHTML = ''
})

describe('styleTag utils', () => {
  it('creates a style tag when missing', () => {
    upsertStyleTag(document.head, STYLE_ID, 'body { color: red; }')

    const style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    expect(style).not.toBeNull()
    expect(style?.textContent).toBe('body { color: red; }')
  })

  it('updates an existing style tag', () => {
    upsertStyleTag(document.head, STYLE_ID, 'body { color: red; }')
    const existing = document.getElementById(STYLE_ID)

    upsertStyleTag(document.head, STYLE_ID, 'body { color: blue; }')
    const updated = document.getElementById(STYLE_ID)

    expect(updated).toBe(existing)
    expect(updated?.textContent).toBe('body { color: blue; }')
  })

  it('removes a style tag when requested', () => {
    upsertStyleTag(document.head, STYLE_ID, 'body { color: red; }')

    removeStyleTag(document.head, STYLE_ID)

    expect(document.getElementById(STYLE_ID)).toBeNull()
  })
})
