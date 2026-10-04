import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'

const createState = (id: string, mode: 'live' | 'archive', continuationVideoId?: string, navigateWithoutSrc = false): YouTubeScenarioState => {
  const base = {
    page: { chatContainer: 'present' as const, chatDimensions: 'standard' as const },
    fullscreen: false,
  }
  const native = {
    state: continuationVideoId ? ('playable' as const) : ('absent' as const),
    continuationVideoId,
    navigateWithoutSrc,
    slot: { beforeId: 'fixture-before', afterId: 'fixture-after' },
  }
  return mode === 'live'
    ? { ...base, video: { id, title: `Iframe runtime ${id}`, mode }, chat: { mode, native, response: 'playable' } }
    : { ...base, video: { id, title: `Iframe runtime ${id}`, mode }, chat: { mode, native, response: 'playable' } }
}

test.describe('borrowed iframe browsing context', () => {
  for (const mode of ['live', 'archive'] as const) {
    test(
      `preserves the current ${mode} runtime when its continuation belongs to the previous SPA video`,
      { tag: ['@fixture', `@${mode}`] },
      async ({ page }) => {
        const first = createState(`ylc-context-${mode}-a`, mode)
        const second = createState(`ylc-context-${mode}-b`, mode, first.video.id)
        const scenario = new YouTubeScenario(page)
        const overlay = new ExtensionOverlay(page)
        await scenario.load(first)
        await scenario.spaNavigate(second)
        await scenario.settleNativeIframeContext()
        await scenario.captureNativeIframeContext()
        const original = await scenario.observeNativeIframeContext()
        expect(original).toMatchObject({ sameDocument: true, sameRuntimeObject: true, runtimeVideoId: first.video.id, loadEvents: 0 })
        expect(new URL(original.src).searchParams.get('v')).toBeNull()
        expect(new URL(original.src).searchParams.get('continuation')).toBe(`ylc-fixture-${first.video.id}`)

        // This document is first observed on the B native host. YouTube changes
        // its in-memory runtime and sign-in target without replacing its A URL.
        await scenario.updateNativeIframeRuntime(second.video.id)
        await scenario.settleNativeIframeContext()
        const retained = {
          connected: true,
          sameDocument: true,
          sameRuntimeObject: true,
          loadEvents: 0,
          src: original.src,
          srcAttributePresent: true,
          documentHref: original.documentHref,
          bodyVideoId: second.video.id,
          runtimeVideoId: second.video.id,
          signInNextVideoId: second.video.id,
        }
        expect(await scenario.observeNativeIframeContext()).toEqual(retained)

        for (let cycle = 0; cycle < 2; cycle++) {
          await scenario.enterFullscreen()
          await overlay.expectSwitchReady({ timeout: 12000 })
          if (mode === 'archive') await overlay.expectArchiveChatPlayable({ timeout: 12000 })
          else await overlay.expectChatLoaded({ timeout: 12000 })
          await expect.poll(() => scenario.observeExtensionIframeIdentity()).toMatchObject({ id: 'chatframe', owned: null, nativeCount: 0 })
          await scenario.settleNativeIframeContext()
          expect(await scenario.observeNativeIframeContext()).toEqual(retained)

          await scenario.exitFullscreen()
          await overlay.expectOverlayRemoved({ timeout: 12000 })
          await expect.poll(() => scenario.observeNativeSlot()).toEqual({
            restored: true,
            attached: null,
            children: ['fixture-before', 'chatframe', 'fixture-after'],
          })
          await scenario.settleNativeIframeContext()
          expect(await scenario.observeNativeIframeContext()).toEqual(retained)
        }
      },
    )
  }

  test('restores a src-less iframe before fullscreen-exit player teardown', { tag: ['@fixture', '@live'] }, async ({ page }) => {
    const state = createState('ylc-exit-current-b', 'live', 'ylc-exit-continuation-a', true)
    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(state)
    await scenario.settleNativeIframeContext()
    await scenario.captureNativeIframeContext()
    const original = await scenario.observeNativeIframeContext()
    expect(original).toMatchObject({ srcAttributePresent: false, runtimeVideoId: 'ylc-exit-continuation-a' })
    expect(original.documentHref).toContain('/live_chat?continuation=ylc-fixture-ylc-exit-continuation-a')
    await scenario.updateNativeIframeRuntime(state.video.id)
    await scenario.installFullscreenExitPlayerDetach()
    const retained = { ...original, bodyVideoId: state.video.id, runtimeVideoId: state.video.id, signInNextVideoId: state.video.id }

    for (let cycle = 0; cycle < 2; cycle++) {
      await scenario.enterFullscreen()
      await overlay.expectChatLoaded({ timeout: 12000 })
      await expect.poll(() => scenario.observeExtensionIframeIdentity()).toMatchObject({ id: 'chatframe', owned: null, nativeCount: 0 })
      await scenario.settleNativeIframeContext()
      expect(await scenario.observeNativeIframeContext()).toEqual(retained)

      await scenario.exitFullscreen()
      await overlay.expectOverlayRemoved({ timeout: 12000 })
      await expect.poll(() => scenario.observeFullscreenExitPlayerDetachCount()).toBe(cycle + 1)
      await expect.poll(() => scenario.observeNativeSlot()).toEqual({
        restored: true,
        attached: null,
        children: ['fixture-before', 'chatframe', 'fixture-after'],
      })
      await scenario.settleNativeIframeContext()
      expect(await scenario.observeNativeIframeContext()).toEqual(retained)
    }
  })
})
