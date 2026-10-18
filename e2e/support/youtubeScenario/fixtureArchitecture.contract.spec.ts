import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('Deterministic scenario architecture', () => {
  it('keeps raw fixture DOM, routing, and mutation knowledge out of deterministic specs', () => {
    const scenarioRoot = fileURLToPath(new URL('../../scenarios', import.meta.url))
    const fixtureSpecs = [
      'archive/borrowRestore.fixture.spec.ts',
      'archive/replayUnavailable.fixture.spec.ts',
      'live/managedNativeHandoff.fixture.spec.ts',
      'live/iframeContextPreservation.fixture.spec.ts',
      'live/noChatVideo.fixture.spec.ts',
      'live/overlayInteraction.fixture.spec.ts',
      'live/spaNavigation.fixture.spec.ts',
    ]

    for (const relativePath of fixtureSpecs) {
      const source = fs.readFileSync(`${scenarioRoot}/${relativePath}`, 'utf8')
      expect(source).toContain('YouTubeScenario')
      expect(source).not.toMatch(/\bpage\s*(?:\.|\?\.)\s*(?:evaluate|goto|route|setContent)\s*\(/)
      expect(source).not.toContain('<!doctype')
      expect(source).not.toContain('buildWatchFixtureHtml')
      expect(source).not.toContain('routeYouTubeWatchFixture')
    }
  })
})
