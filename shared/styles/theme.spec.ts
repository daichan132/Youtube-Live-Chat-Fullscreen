import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const themeStyles = readFileSync(resolve(process.cwd(), 'shared/styles/theme.css'), 'utf8')

describe('theme layer scale', () => {
  it('defines ordered local surface layers', () => {
    expect(themeStyles).toContain('--ylc-z-raised: 10;')
    expect(themeStyles).toContain('--ylc-z-popover: 20;')
    expect(themeStyles).toContain('--ylc-z-tooltip: 30;')
    expect(themeStyles).toContain('--ylc-z-toast: 40;')
  })

  it('uses named layers instead of independent numeric z-index values', () => {
    const declarations = Array.from(themeStyles.matchAll(/z-index:\s*([^;]+);/g), match => match[1].trim())

    expect(declarations).not.toHaveLength(0)
    expect(declarations.every(value => value.startsWith('var(--ylc-z-'))).toBe(true)
  })
})
