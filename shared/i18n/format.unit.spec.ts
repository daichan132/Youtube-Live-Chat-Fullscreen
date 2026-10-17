import { describe, expect, it } from 'vitest'
import { formatMessage } from './format'

describe('formatMessage', () => {
  it('substitutes named slots in translation order, including repeated slots', () => {
    expect(formatMessage('{position}: {name}, {name}', { name: 'Movie Night', position: 2 })).toBe('2: Movie Night, Movie Night')
  })

  it('preserves slots without an explicitly supplied value', () => {
    expect(formatMessage('{name}: {position} {constructor}', { name: 'Movie Night' })).toBe('Movie Night: {position} {constructor}')
  })

  it('supports named slots containing punctuation', () => {
    expect(formatMessage('Reorder {display-name}', { 'display-name': 'Movie Night' })).toBe('Reorder Movie Night')
  })

  it('accepts empty strings and numeric zero while ignoring unused values', () => {
    expect(formatMessage('{name}{count}', { name: '', count: 0, unused: 'ignored' })).toBe('0')
  })

  it.each(['$&', '$$', '$`', "$'"])('keeps replacement syntax %s literal inside a supplied value', name => {
    expect(formatMessage('Reorder {name}', { name })).toBe(`Reorder ${name}`)
  })

  it('does not interpret supplied values as further placeholders', () => {
    expect(formatMessage('Moved {name} to position {position}', { name: '{position}', position: 2 })).toBe('Moved {position} to position 2')
  })
})
