import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  ACCESSIBILITY_PROJECT_NAME,
  CANARY_SPECS,
  DETERMINISTIC_PROJECT_NAMES,
  FIXTURE_PROJECT_NAME,
  FIXTURE_SPECS,
  PRODUCTION_CHROME_PROJECT_NAME,
  VISUAL_PROJECT_NAME,
} from './projectClassification'

const scenariosDir = fileURLToPath(new URL('../scenarios', import.meta.url))

const collectSpecs = (directory: string, relativeDirectory = ''): string[] =>
  fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
      const relativePath = path.posix.join(relativeDirectory, entry.name)
      if (entry.isDirectory()) return collectSpecs(path.join(directory, entry.name), relativePath)
      return entry.isFile() && entry.name.endsWith('.spec.ts') ? [relativePath] : []
    })
    .sort()

describe('Playwright project classification', () => {
  it('classifies every scenario exactly once', () => {
    const fixtureSpecs = [...FIXTURE_SPECS]
    const canarySpecs = [...CANARY_SPECS]
    const classifiedSpecs = [...fixtureSpecs, ...canarySpecs]

    expect(new Set(fixtureSpecs).size).toBe(fixtureSpecs.length)
    expect(new Set(canarySpecs).size).toBe(canarySpecs.length)
    expect(fixtureSpecs.filter(spec => canarySpecs.includes(spec as never))).toEqual([])
    expect(classifiedSpecs.sort()).toEqual(collectSpecs(scenariosDir))
  })

  it('keeps the deterministic project limited to fixtures and popup tests', () => {
    expect(FIXTURE_SPECS.every(spec => spec.endsWith('.fixture.spec.ts') || spec.startsWith('popup/'))).toBe(true)
    expect(CANARY_SPECS.every(spec => !spec.endsWith('.fixture.spec.ts') && !spec.startsWith('popup/'))).toBe(true)
  })

  it('classifies fixture, visual, and accessibility projects as network independent', () => {
    expect(DETERMINISTIC_PROJECT_NAMES).toEqual([
      FIXTURE_PROJECT_NAME,
      VISUAL_PROJECT_NAME,
      ACCESSIBILITY_PROJECT_NAME,
      PRODUCTION_CHROME_PROJECT_NAME,
    ])
  })
})
