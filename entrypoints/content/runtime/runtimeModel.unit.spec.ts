import { describe, expect, it } from 'vitest'
import type { ChatDecision } from './resolveChatDecision'
import {
  createInitialRuntimeModel,
  MAX_RETRY_ATTEMPTS,
  markRuntimeRetryFired,
  type RuntimeLeaseSnapshot,
  type RuntimeModel,
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
        source: { kind: 'live_borrow', videoId, iframe: sourceIframe },
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

  it('releases the old lease before creating one for an SPA video transition', () => {
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

  it('does not create a second lease when the available source still matches', () => {
    const decision = available('video-1', 'live')
    const active = activate(decision)
    const transition = transitionRuntimeModel(active.model, {
      enabled: true,
      decision,
      lease: active.lease,
    })

    expect(transition.plan.chat).toEqual({ kind: 'acquire', decision })
  })

  it('ends retry exhaustion as unavailable and physically disables portal hosts', () => {
    const pending: ChatDecision = { kind: 'pending', videoId: 'video-1', mode: 'live', canToggle: false }
    let model: RuntimeModel = createInitialRuntimeModel()
    let finalTransition = transitionRuntimeModel(model, { enabled: true, decision: pending, lease: null })

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
      expect(finalTransition.plan.retry.kind).toBe('scheduled')
      model = markRuntimeRetryFired(finalTransition.model)
      finalTransition = transitionRuntimeModel(model, { enabled: true, decision: pending, lease: null })
    }

    expect(finalTransition.model.state).toEqual({ status: 'unavailable', videoId: 'video-1' })
    expect(finalTransition.model.view.showOverlay).toBe(false)
    expect(finalTransition.plan.presentation).toBe('none')
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
