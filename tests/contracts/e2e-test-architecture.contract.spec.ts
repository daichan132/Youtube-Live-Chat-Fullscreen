import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const readSource = (path: string) => readFile(resolve(root, path), 'utf8')

const fixtureModules = [
  'e2e/fixtures/deterministic.ts',
  'e2e/fixtures/fullscreen.ts',
  'e2e/fixtures/canary.ts',
  'e2e/fixtures/index.ts',
]

const extensionSupportModules = [
  'e2e/support/extension/extensionContext.ts',
  'e2e/support/extension/extensionIdentity.ts',
  'e2e/support/extension/extensionStorage.ts',
  'e2e/support/extension/extensionDiagnostics.ts',
]

describe('E2E test architecture', () => {
  it('keeps the legacy fixture entrypoint as a compatibility-only barrel', async () => {
    expect(await readSource('e2e/fixtures.ts')).toBe(
      "// Compatibility barrel for existing `@e2e/fixtures` imports.\nexport { expect, test } from './fixtures/index'\nexport type { Extension } from './fixtures/index'\n",
    )
    await expect(Promise.all([...fixtureModules, ...extensionSupportModules].map(readSource))).resolves.toHaveLength(8)
  })

  it('keeps deterministic reset strict and network independent', async () => {
    const deterministic = await readSource('e2e/fixtures/deterministic.ts')
    expect(deterministic).toContain("context.route(/^https?:\\/\\//, route => route.abort('blockedbyclient'))")
    expect(deterministic).toContain('await extension.storage.clear()')
    expect(deterministic).not.toContain('.catch(')
    expect(deterministic).not.toContain('.skip(')
  })

  it('keeps URL discovery in the canary fixture layer', async () => {
    const [fullscreen, canary] = await Promise.all([
      readSource('e2e/fixtures/fullscreen.ts'),
      readSource('e2e/fixtures/canary.ts'),
    ])
    expect(fullscreen).not.toMatch(/findLiveUrlWithChat|selectArchiveReplayUrl|urlLookupContext/)
    expect(canary).toMatch(/findLiveUrlWithChat|selectArchiveReplayUrl|urlLookupContext/)
  })

  it('attaches common failure diagnostics from the fullscreen fixture', async () => {
    const [fullscreen, diagnostics] = await Promise.all([
      readSource('e2e/fixtures/fullscreen.ts'),
      readSource('e2e/support/extension/extensionDiagnostics.ts'),
    ])
    expect(fullscreen).toMatch(/_extensionDiagnostics[\s\S]*observeBrowserLogs[\s\S]*attachFailureDiagnostics/)
    expect(diagnostics).toMatch(/url: page\.url\(\)/)
    expect(diagnostics).toMatch(/runtime:[\s\S]*portals:[\s\S]*nativeIframe:[\s\S]*extensionIframe:/)
    expect(diagnostics).toMatch(/console: logs\.console[\s\S]*pageErrors: logs\.pageErrors/)
  })

  it('keeps page objects assertion-oriented', async () => {
    const pageObjects = (
      await Promise.all(['e2e/pages/ExtensionOverlay.ts', 'e2e/pages/YouTubeWatchPage.ts'].map(readSource))
    ).join('\n')
    expect(pageObjects).not.toMatch(
      /\b(?:waitForSwitchReady|ensureSwitchOff|waitForChatLoaded|waitForArchiveChatPlayable|waitForChatDetached|waitForOverlayRemoved|waitForNativeChat|ensureFullscreen|exitFullscreen)\b/,
    )
    expect(pageObjects).not.toContain('Promise<boolean>')
    expect(pageObjects).not.toContain('.catch(')
    expect(pageObjects).toMatch(/expectSwitchReady|expectChatLoaded|expectFullscreenExited|expectNativeChat/)
  })
})
