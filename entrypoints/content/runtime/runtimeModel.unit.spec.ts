import { describe, expect, it } from 'vitest'
import type { ChatDecision } from './resolveChatDecision'
import {
  createInitialRuntimeModel,
  markRuntimeRetryFired,
  type RuntimeLeaseSnapshot,
  resetRuntimeRetry,
  settleRuntimeLeaseInitialization,
  stopRuntimeModel,
  transitionRuntimeModel,
} from './runtimeModel'

const iframe = (identity: string) => ({ identity }) as unknown as HTMLIFrameElement

const available = (
  videoId: string,
  mode: 'live' | 'archive',
  sourceIframe = iframe(`${videoId}-${mode}`),
): Extract<ChatDecision, { kind: 'available' }> =>
  mode === 'live'
    ? {
        kind: 'available',
        videoId,
        mode,
        source: { kind: 'live_borrow', iframe: sourceIframe },
      }
    : {
        kind: 'available',
        videoId,
        mode,
        source: { kind: 'archive_borrow', iframe: sourceIframe },
      }

const leaseFor = (decision: Extract<ChatDecision, { kind: 'available' }>): RuntimeLeaseSnapshot => ({
  videoId: decision.videoId,
  kind: 'borrowed',
  iframe: decision.source.kind === 'live_direct' ? iframe('managed') : decision.source.iframe,
})

const activate = (decision: Extract<ChatDecision, { kind: 'available' }>) => {
  const lease = leaseFor(decision)
  const planned = transitionRuntimeModel(createInitialRuntimeModel(), {
    enabled: true,
    decision,
    lease: null,
  })
  const settled = settleRuntimeLeaseInitialization(planned.model, {
    decision,
    lease,
    initialized: true,
  })
  return { model: settled.model, lease }
}

describe('runtimeModel', () => {
  it.each([
    ['live', available('video-live', 'live')],
    ['archive', available('video-archive', 'archive')],
  ] as const)('activates an available %s source through an explicit lease initialization', (_, decision) => {
    const planned = transitionRuntimeModel(createInitialRuntimeModel(), {
      enabled: true,
      decision,
      lease: null,
    })

    expect(planned.plan).toMatchObject({
      monitoring: 'active',
      presentation: 'overlay-and-switch',
      layout: 'floating',
      chat: { kind: 'acquire', decision },
    })

    const settled = settleRuntimeLeaseInitialization(planned.model, {
      decision,
      lease: leaseFor(decision),
      initialized: true,
    })
    expect(settled.model.state).toMatchObject({
      status: 'active',
      videoId: decision.videoId,
      mode: decision.mode,
    })
    expect(settled.model.view).toEqual({
      status: 'active',
      mode: decision.mode,
      showSwitch: true,
      showOverlay: true,
      loading: false,
    })
  })

  it('keeps unavailable/no-chat state free of leases, switch, and overlay', () => {
    const transition = transitionRuntimeModel(createInitialRuntimeModel(), {
      enabled: true,
      decision: { kind: 'unavailable', videoId: 'ordinary-video' },
      lease: null,
    })

    expect(transition.model.view).toMatchObject({
      status: 'unavailable',
      showSwitch: false,
      showOverlay: false,
    })
    expect(transition.plan.presentation).toBe('none')
    expect(transition.plan.chat.kind).not.toBe('acquire')
  })

  it('releases an archive lease and clears the runtime on fullscreen exit', () => {
    const decision = available('archive-video', 'archive')
    const active = activate(decision)
    const transition = transitionRuntimeModel(active.model, {
      enabled: true,
      decision: { kind: 'inactive', reason: 'not-fullscreen' },
      lease: active.lease,
    })

    expect(transition.model.view.showOverlay).toBe(false)
    expect(transition.plan).toMatchObject({
      monitoring: 'inactive',
      presentation: 'none',
      chat: { kind: 'none', ensureNativeVisible: true },
      layout: 'none',
    })
  })

  it('releases the lease and clears the runtime when leaving the watch page', () => {
    const decision = available('archive-video', 'archive')
    const active = activate(decision)
    const transition = transitionRuntimeModel(active.model, {
      enabled: true,
      decision: { kind: 'inactive', reason: 'not-watch-page' },
      lease: active.lease,
    })

    expect(transition.model.state).toEqual({ status: 'inactive', reason: 'not-watch-page' })
    expect(transition.model.view).toEqual({
      status: 'inactive',
      mode: null,
      showSwitch: false,
      showOverlay: false,
      loading: false,
    })
    expect(transition.plan).toMatchObject({
      monitoring: 'inactive',
      presentation: 'none',
      chat: { kind: 'none', ensureNativeVisible: false },
      layout: 'none',
    })
  })

  it('plans acquisition for the next video during an SPA transition', () => {
    const first = available('video-1', 'live')
    const active = activate(first)
    const second = available('video-2', 'live')
    const transition = transitionRuntimeModel(active.model, {
      enabled: true,
      decision: second,
      lease: active.lease,
    })

    expect(transition.plan.chat).toEqual({ kind: 'acquire', decision: second })
  })

  it('replaces a borrowed lease when the same video resolves to a different iframe', () => {
    const first = available('video-1', 'live', iframe('first-source'))
    const active = activate(first)
    const second = available('video-1', 'live', iframe('replacement-source'))
    const transition = transitionRuntimeModel(active.model, {
      enabled: true,
      decision: second,
      lease: active.lease,
    })

    expect(transition.plan.chat).toEqual({ kind: 'acquire', decision: second })
  })

  it('keeps one matching lease during temporary source loss', () => {
    const decision = available('video-1', 'live')
    const active = activate(decision)
    const transition = transitionRuntimeModel(active.model, {
      enabled: true,
      decision: { kind: 'pending', videoId: 'video-1', mode: 'live', canToggle: true },
      lease: active.lease,
    })

    expect(transition.model.state).toMatchObject({
      status: 'recovering',
      videoId: 'video-1',
    })
    expect(transition.model.view.showOverlay).toBe(true)
    expect(transition.plan.chat).toEqual({ kind: 'preserve' })
  })

  it('plans release of a managed live lease while opening replay for the same video', () => {
    const decision: Extract<ChatDecision, { kind: 'available' }> = {
      kind: 'available',
      videoId: 'video-1',
      mode: 'live',
      source: {
        kind: 'live_direct',
        url: 'https://www.youtube.com/live_chat?v=video-1',
      },
    }
    const lease: RuntimeLeaseSnapshot = {
      videoId: 'video-1',
      kind: 'managed',
      iframe: iframe('managed-live'),
    }
    const planned = transitionRuntimeModel(createInitialRuntimeModel(), {
      enabled: true,
      decision,
      lease: null,
    })
    const active = settleRuntimeLeaseInitialization(planned.model, {
      decision,
      lease,
      initialized: true,
    })

    const transition = transitionRuntimeModel(active.model, {
      enabled: true,
      decision: { kind: 'pending', videoId: 'video-1', mode: 'archive', canToggle: true },
      lease,
    })

    expect(transition.plan).toMatchObject({
      chat: { kind: 'none', ensureNativeVisible: false },
      openArchivePanel: true,
      presentation: 'overlay-and-switch',
      layout: 'floating',
    })
    expect(transition.model.state).toEqual({ status: 'searching', videoId: 'video-1' })
  })

  it('plans acquisition for the reconciler to reuse an available matching source', () => {
    const decision = available('video-1', 'live')
    const active = activate(decision)
    const transition = transitionRuntimeModel(active.model, {
      enabled: true,
      decision,
      lease: active.lease,
    })

    expect(transition.plan.chat).toEqual({ kind: 'acquire', decision })
  })

  it.each(['searching', 'recovering'] as const)('bounds %s to the documented retry budget before hiding loading UI', status => {
    const active = status === 'recovering' ? activate(available('video-1', 'live')) : { model: createInitialRuntimeModel(), lease: null }
    const input = {
      enabled: true,
      decision: { kind: 'pending', videoId: 'video-1', mode: 'live', canToggle: true } as const,
      lease: active.lease,
    }
    let transition = transitionRuntimeModel(active.model, input)
    // The waiting budget in content-runtime.md is independent of implementation constants.
    const expectedDelaysMs = [250, 500, 1000, 2000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000]
    for (const delayMs of expectedDelaysMs) {
      expect(transition.plan.retry).toEqual({ kind: 'scheduled', delayMs })
      expect(transition.model.view).toMatchObject({ status, loading: true, showSwitch: true, showOverlay: true })
      transition = transitionRuntimeModel(markRuntimeRetryFired(transition.model), input)
    }

    expect(transition.model.state).toEqual({ status: 'unavailable', videoId: 'video-1' })
    expect(transition.model.view).toEqual({
      status: 'unavailable',
      mode: null,
      showSwitch: false,
      showOverlay: false,
      loading: false,
    })
    expect(transition.plan).toMatchObject({
      presentation: 'none',
      layout: 'none',
      chat: active.lease ? { kind: 'none', ensureNativeVisible: false } : { kind: 'preserve' },
    })
    expect(transition.plan.retry.kind).not.toBe('scheduled')

    const observedAgain = transitionRuntimeModel(transition.model, input)
    expect(observedAgain.model.view).toEqual(transition.model.view)
    expect(observedAgain.plan.retry.kind).not.toBe('scheduled')
  })

  it('resets a pending retry and recovers after lease initialization becomes available', () => {
    const decision = available('video-1', 'live')
    const lease = leaseFor(decision)
    const planned = transitionRuntimeModel(createInitialRuntimeModel(), {
      enabled: true,
      decision,
      lease: null,
    })
    const failed = settleRuntimeLeaseInitialization(planned.model, {
      decision,
      lease,
      initialized: false,
    })

    expect(failed.model).toMatchObject({
      retryAttempts: 1,
      retryPending: true,
      state: { status: 'recovering', videoId: 'video-1' },
    })
    expect(failed.plan.retry).toMatchObject({ kind: 'scheduled', delayMs: 250 })

    const reset = resetRuntimeRetry(failed.model)
    expect(reset.plan.retry).toEqual({ kind: 'none' })
    expect(reset.model).toMatchObject({
      retryAttempts: 0,
      retryPending: false,
    })

    const retry = transitionRuntimeModel(reset.model, {
      enabled: true,
      decision,
      lease,
    })
    expect(retry.plan.chat).toEqual({ kind: 'acquire', decision })

    const recovered = settleRuntimeLeaseInitialization(retry.model, {
      decision,
      lease,
      initialized: true,
    })
    expect(recovered.model).toMatchObject({
      retryAttempts: 0,
      retryPending: false,
      state: { status: 'active', videoId: 'video-1', mode: 'live' },
    })
    expect(recovered.model.view.loading).toBe(false)
  })

  it('releases an active archive lease while retaining the available switch when disabled', () => {
    const decision = available('video-1', 'archive')
    const active = activate(decision)
    const transition = transitionRuntimeModel(active.model, {
      enabled: false,
      decision,
      lease: active.lease,
    })

    expect(transition.model.state).toEqual({ status: 'inactive', reason: 'disabled' })
    expect(transition.model.view).toMatchObject({ showSwitch: true, showOverlay: false })
    expect(transition.plan.chat).toEqual({ kind: 'none', ensureNativeVisible: true })
  })

  it('declares complete cleanup for stop while a retry and lease are owned', () => {
    const decision = available('video-1', 'live')
    const active = activate(decision)
    const pending = transitionRuntimeModel(active.model, {
      enabled: true,
      decision: { kind: 'pending', videoId: 'video-1', mode: 'live', canToggle: true },
      lease: active.lease,
    })
    const stopped = stopRuntimeModel(pending.model, active.lease)

    expect(stopped.model).toEqual(createInitialRuntimeModel())
    expect(stopped.plan).toMatchObject({
      monitoring: 'inactive',
      presentation: 'none',
      chat: { kind: 'none', ensureNativeVisible: false },
      layout: 'none',
      retry: { kind: 'none' },
    })
  })
})
