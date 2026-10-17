import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const themeStyles = readFileSync(resolve(process.cwd(), 'shared/styles/controls.css'), 'utf8')

describe('theme layer scale', () => {
  it('defines ordered local surface layers', () => {
    const layer = (name: string) => {
      const declaration = themeStyles.match(new RegExp(`--ylc-z-${name}\\s*:\\s*([+-]?\\d+)\\s*;`))
      expect(declaration, `Missing numeric layer: ${name}`).not.toBeNull()
      return Number(declaration?.[1])
    }

    expect(layer('raised')).toBeLessThan(layer('popover'))
    expect(layer('popover')).toBeLessThan(layer('tooltip'))
    expect(layer('tooltip')).toBeLessThan(layer('toast'))
  })

  it('uses named layers instead of independent numeric z-index values', () => {
    const declarations = Array.from(themeStyles.matchAll(/z-index:\s*([^;]+);/g)).flatMap(match => (match[1] ? [match[1].trim()] : []))

    expect(declarations).not.toHaveLength(0)
    expect(declarations.every(value => value.startsWith('var(--ylc-z-'))).toBe(true)
  })
})
