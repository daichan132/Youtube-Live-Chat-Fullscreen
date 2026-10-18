import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SHADOW_HOST_ID, SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'
import { createSessionScope } from '../bootstrap/SessionScope'
import type { PageObservation } from '../platform/youtube/types'
import { ResourceReconciler } from './ResourceReconciler'
import type { ChatDecision } from './resolveChatDecision'
import type { RuntimePlan } from './runtimeModel'

vi.mock('wxt/browser', () => ({
  browser: { runtime: { getURL: (path: string) => `chrome-extension://test/${path}` } },
}))

const cleanups: (() => void)[] = []
const onLoad = () => {}
const switchOnlyPlan: RuntimePlan = {
  monitoring: 'active',
  presentation: 'switch-only',
  chat: { kind: 'none', ensureNativeVisible: false },
  layout: 'none',
  retry: { kind: 'none' },
}
const preservePlan: RuntimePlan = {
  monitoring: 'active',
  presentation: 'preserve',
  chat: { kind: 'preserve' },
  layout: 'preserve',
  retry: { kind: 'preserve' },
}
const stopPlan: RuntimePlan = {
  monitoring: 'inactive',
  presentation: 'none',
  chat: { kind: 'none', ensureNativeVisible: false },
  layout: 'none',
  retry: { kind: 'none' },
}

const createNativeHost = (videoId = 'video-1') => {
  const host = document.createElement('ytd-live-chat-frame')
  host.setAttribute('video-id', videoId)
  document.body.append(host)
  return host
}

const acquireNativeChat = (mode: 'live' | 'archive') => {
  const player = document.createElement('div')
  const controls = document.createElement('div')
  player.append(controls)
  document.body.append(player)
  const nativeHost = createNativeHost()
  const iframe = document.createElement('iframe')
  iframe.src = `/live_chat${mode === 'archive' ? '_replay' : ''}?v=video-1`
  const nativeSibling = document.createElement('span')
  nativeHost.append(iframe, nativeSibling)
  const observation: PageObservation = {
    evidence: {
      generation: 1,
      videoId: 'video-1',
      route: 'watch',
      fullscreen: true,
      videoMode: mode,
      chatAvailability: 'ready',
      capabilities: {
        canBorrowNativeChat: true,
        canCreateManagedLiveChat: mode === 'live',
        canOpenArchiveChat: mode === 'archive',
        canRestoreNativeChat: true,
        canMountOverlay: true,
        canMountPlayerSwitch: true,
      },
      sourceKind: mode === 'live' ? 'native-live' : 'native-replay',
      probeIds: [],
    },
    targets: {
      player,
      fullscreenRoot: player,
      rightControls: controls,
      nativeChatHost: nativeHost,
      nativeChatIframe: iframe,
      chatIframe: iframe,
      archiveOpenControl: null,
    },
  }
  const decision: Extract<ChatDecision, { kind: 'available' }> = {
    kind: 'available',
    videoId: 'video-1',
    mode,
    source: mode === 'archive' ? { kind: 'archive_borrow', iframe } : { kind: 'live_borrow', videoId: 'video-1', iframe },
  }
  const activePlan: RuntimePlan = {
    monitoring: 'active',
    presentation: 'overlay-and-switch',
    chat: { kind: 'acquire', decision },
    layout: 'floating',
    retry: { kind: 'none' },
  }
  const resources = new ResourceReconciler()
  const scope = createSessionScope(1)
  cleanups.push(() => {
    resources.clear()
    scope.dispose()
  })
  // React supplies a carrier after the presentation has mounted its Shadow Root.
  const { targets } = resources.reconcilePlan(activePlan, observation, scope, onLoad)
  if (!targets.overlayRoot) throw new Error('Expected a mounted chat overlay')
  const carrier = document.createElement('div')
  targets.overlayRoot.append(carrier)
  resources.setOverlayContainer(carrier)
  resources.reconcilePlan(activePlan, observation, scope, onLoad)

  expect(carrier.querySelector('iframe')).toBe(iframe)
  expect(nativeHost.querySelector('iframe')).toBeNull()

  return { resources, scope, observation, nativeHost, nativeSibling, iframe, targets, controls, carrier }
}

describe('ResourceReconciler owned DOM lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/watch?v=video-1')
    document.body.replaceChildren()
  })

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it.each(['live', 'archive'] as const)('returns the %s iframe to its native slot and keeps only the switch when disabled', mode => {
    const { resources, scope, observation, nativeHost, nativeSibling, iframe, targets, controls } = acquireNativeChat(mode)
    expect(document.documentElement).toHaveClass('ylc-fullscreen-chat-fix')
    expect(document.getElementById('ylc-fullscreen-chat-layout-fix')).not.toBeNull()

    const disabled = resources.reconcilePlan(switchOnlyPlan, observation, scope, onLoad)

    expect(nativeHost.firstChild).toBe(iframe)
    expect(iframe.nextSibling).toBe(nativeSibling)
    expect(iframe.hasAttribute('data-ylc-chat')).toBe(false)
    expect(targets.overlayRoot?.host.isConnected).toBe(false)
    expect(document.getElementById(SHADOW_HOST_ID)).toBeNull()
    expect(disabled.targets.overlayRoot).toBeNull()
    expect(disabled.targets.switchContainer).toBe(targets.switchContainer)
    expect(controls.querySelector(`#${SWITCH_BUTTON_CONTAINER_ID}`)).toBe(targets.switchContainer)
    expect(document.documentElement).not.toHaveClass('ylc-fullscreen-chat-fix')
    expect(document.getElementById('ylc-fullscreen-chat-layout-fix')).toBeNull()
  })

  it('restores the same iframe into a later matching native host without adopting a different video host', () => {
    const { resources, scope, observation, nativeHost, iframe } = acquireNativeChat('archive')
    nativeHost.remove()
    observation.targets.nativeChatHost = null
    resources.reconcilePlan(switchOnlyPlan, observation, scope, onLoad)

    expect(iframe.isConnected).toBe(false)
    expect(resources.getDiagnosticSnapshot().restoringChatCount).toBe(1)
    const otherVideoHost = createNativeHost('other-video')
    observation.targets.nativeChatHost = otherVideoHost
    resources.reconcilePlan(preservePlan, observation, scope, onLoad)
    expect(otherVideoHost.querySelector('iframe')).toBeNull()
    expect(iframe.isConnected).toBe(false)
    expect(resources.getDiagnosticSnapshot().restoringChatCount).toBe(1)

    const rebuiltHost = createNativeHost()
    const rebuiltSibling = document.createElement('span')
    rebuiltHost.append(rebuiltSibling)
    observation.targets.nativeChatHost = rebuiltHost
    resources.reconcilePlan(preservePlan, observation, scope, onLoad)
    resources.reconcilePlan(preservePlan, observation, scope, onLoad)

    expect(rebuiltHost.firstChild).toBe(iframe)
    expect(iframe.nextSibling).toBe(rebuiltSibling)
    expect(otherVideoHost.querySelector('iframe')).toBeNull()
    expect(iframe.hasAttribute('data-ylc-chat')).toBe(false)
    expect(resources.getDiagnosticSnapshot().restoringChatCount).toBe(0)
  })

  it('does not resurrect a pending iframe after monitoring stops', () => {
    const { resources, scope, observation, nativeHost, iframe } = acquireNativeChat('archive')
    nativeHost.remove()
    observation.targets.nativeChatHost = null
    resources.reconcilePlan(switchOnlyPlan, observation, scope, onLoad)
    expect(resources.getDiagnosticSnapshot().restoringChatCount).toBe(1)

    resources.reconcilePlan(stopPlan, observation, scope, onLoad)

    expect(resources.getDiagnosticSnapshot().restoringChatCount).toBe(0)
    expect(document.getElementById(SWITCH_BUTTON_CONTAINER_ID)).toBeNull()
    const rebuiltHost = createNativeHost()
    observation.targets.nativeChatHost = rebuiltHost
    resources.reconcilePlan(switchOnlyPlan, observation, scope, onLoad)
    expect(rebuiltHost.querySelector('iframe')).toBeNull()
    expect(iframe.isConnected).toBe(false)
  })
})
