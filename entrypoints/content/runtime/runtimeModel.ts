import type { ChatDecision } from './resolveChatDecision'

export type RuntimeState =
  | {
      status: 'inactive'
      reason: 'disabled' | 'not-watch-page' | 'not-fullscreen'
    }
  | {
      status: 'searching'
      videoId: string | null
    }
  | {
      status: 'active'
      videoId: string
      mode: 'live' | 'archive'
      sourceKind: 'borrowed' | 'managed'
    }
  | {
      status: 'recovering'
      videoId: string
      mode: 'live' | 'archive'
      sourceKind: 'borrowed' | 'managed'
    }
  | {
      status: 'unavailable'
      videoId: string
    }

export type RuntimeModelView = {
  status: RuntimeState['status']
  mode: 'live' | 'archive' | null
  showSwitch: boolean
  showOverlay: boolean
  loading: boolean
}

export type RuntimeLeaseSnapshot = {
  videoId: string
  kind: 'borrowed' | 'managed'
  iframe: unknown
}

export type RuntimeModel = {
  state: RuntimeState
  view: RuntimeModelView
  retryAttempts: number
  retryPending: boolean
  observing: boolean
}

type AvailableDecision = Extract<ChatDecision, { kind: 'available' }>

export type RuntimeModelAction =
  | { type: 'ensure-observer' }
  | { type: 'disconnect-observer' }
  | { type: 'clear-layout' }
  | { type: 'clear-runtime' }
  | { type: 'release-lease'; ensureNativeVisible: boolean }
  | { type: 'create-lease'; decision: AvailableDecision }
  | { type: 'initialize-lease'; decision: AvailableDecision }
  | { type: 'cancel-retry' }
  | { type: 'schedule-retry'; delayMs: number }
  | { type: 'open-archive-panel' }
  | {
      type: 'sync-portals'
      showSwitch: boolean
      showOverlay: boolean
      keepOverlayHost: boolean
    }

export type RuntimeModelTransition = {
  model: RuntimeModel
  actions: RuntimeModelAction[]
}

export const RETRY_DELAYS_MS = [250, 500, 1000, 2000, 5000] as const
export const MAX_RETRY_ATTEMPTS = 12

const inactiveView: RuntimeModelView = {
  status: 'inactive',
  mode: null,
  showSwitch: false,
  showOverlay: false,
  loading: false,
}

export const createInitialRuntimeModel = (): RuntimeModel => ({
  state: { status: 'inactive', reason: 'disabled' },
  view: inactiveView,
  retryAttempts: 0,
  retryPending: false,
  observing: false,
})

const getMode = (state: RuntimeState): RuntimeModelView['mode'] =>
  state.status === 'active' || state.status === 'recovering' ? state.mode : null

const createView = (state: RuntimeState, showSwitch: boolean, showOverlay: boolean): RuntimeModelView => ({
  status: state.status,
  mode: getMode(state),
  showSwitch,
  showOverlay,
  loading: state.status === 'searching' || state.status === 'recovering',
})

const sourceMatchesLease = (decision: AvailableDecision, lease: RuntimeLeaseSnapshot | null) => {
  if (!lease || lease.videoId !== decision.videoId) return false
  if (decision.source.kind === 'live_direct') return lease.kind === 'managed'
  return lease.kind === 'borrowed' && lease.iframe === decision.source.iframe
}

const resetRetry = (model: RuntimeModel, actions: RuntimeModelAction[]) => {
  if (model.retryPending) actions.push({ type: 'cancel-retry' })
  return {
    ...model,
    retryAttempts: 0,
    retryPending: false,
  }
}

const ensureObserver = (model: RuntimeModel, actions: RuntimeModelAction[]) => {
  if (model.observing) return model
  actions.push({ type: 'ensure-observer' })
  return { ...model, observing: true }
}

const scheduleRetry = (model: RuntimeModel, lease: RuntimeLeaseSnapshot | null, actions: RuntimeModelAction[]): RuntimeModel => {
  if (model.retryPending) return model
  if (model.retryAttempts >= MAX_RETRY_ATTEMPTS) {
    if (lease) actions.push({ type: 'release-lease', ensureNativeVisible: false })
    actions.push({ type: 'sync-portals', showSwitch: false, showOverlay: false, keepOverlayHost: false })
    if (model.state.status !== 'searching' && model.state.status !== 'recovering') return model
    if (!model.state.videoId) return model
    const state: RuntimeState = { status: 'unavailable', videoId: model.state.videoId }
    return {
      ...model,
      state,
      view: createView(state, false, false),
    }
  }

  const delayMs = RETRY_DELAYS_MS[Math.min(model.retryAttempts, RETRY_DELAYS_MS.length - 1)]
  actions.push({ type: 'schedule-retry', delayMs })
  return {
    ...model,
    retryAttempts: model.retryAttempts + 1,
    retryPending: true,
  }
}

export const resetRuntimeRetry = (model: RuntimeModel): RuntimeModelTransition => {
  const actions: RuntimeModelAction[] = []
  return { model: resetRetry(model, actions), actions }
}

export const markRuntimeRetryFired = (model: RuntimeModel): RuntimeModel => ({
  ...model,
  retryPending: false,
})

export const stopRuntimeModel = (model: RuntimeModel, lease: RuntimeLeaseSnapshot | null): RuntimeModelTransition => {
  const actions: RuntimeModelAction[] = []
  if (lease) actions.push({ type: 'release-lease', ensureNativeVisible: false })
  if (model.retryPending) actions.push({ type: 'cancel-retry' })
  if (model.observing) actions.push({ type: 'disconnect-observer' })
  actions.push({ type: 'clear-runtime' })
  return {
    model: createInitialRuntimeModel(),
    actions,
  }
}

export const transitionRuntimeModel = (
  model: RuntimeModel,
  input: {
    enabled: boolean
    decision: ChatDecision
    lease: RuntimeLeaseSnapshot | null
  },
): RuntimeModelTransition => {
  const actions: RuntimeModelAction[] = []
  let next = model
  let lease = input.lease

  if (input.decision.kind === 'inactive') {
    const ensureNativeVisible =
      input.decision.reason === 'not-fullscreen' &&
      (model.state.status === 'active' || model.state.status === 'recovering') &&
      model.state.mode === 'archive'
    if (lease) actions.push({ type: 'release-lease', ensureNativeVisible })
    next = resetRetry(next, actions)
    if (next.observing) actions.push({ type: 'disconnect-observer' })
    actions.push({ type: 'clear-runtime' })
    return {
      model: {
        ...next,
        state: { status: 'inactive', reason: input.decision.reason },
        view: inactiveView,
        observing: false,
      },
      actions,
    }
  }

  next = ensureObserver(next, actions)

  if (!input.enabled) {
    const showSwitch = input.decision.kind === 'available' || (input.decision.kind === 'pending' && input.decision.canToggle)
    const ensureNativeVisible = (model.state.status === 'active' || model.state.status === 'recovering') && model.state.mode === 'archive'
    if (lease) actions.push({ type: 'release-lease', ensureNativeVisible })
    actions.push({ type: 'clear-layout' })
    next = resetRetry(next, actions)
    const state: RuntimeState = { status: 'inactive', reason: 'disabled' }
    actions.push({ type: 'sync-portals', showSwitch, showOverlay: false, keepOverlayHost: showSwitch })
    return {
      model: {
        ...next,
        state,
        view: createView(state, showSwitch, false),
      },
      actions,
    }
  }

  if (lease && input.decision.videoId !== lease.videoId) {
    actions.push({ type: 'release-lease', ensureNativeVisible: false })
    lease = null
    next = resetRetry(next, actions)
  }

  if (input.decision.kind === 'unavailable') {
    if (lease) actions.push({ type: 'release-lease', ensureNativeVisible: false })
    next = resetRetry(next, actions)
    const state: RuntimeState = { status: 'unavailable', videoId: input.decision.videoId }
    actions.push({ type: 'sync-portals', showSwitch: false, showOverlay: false, keepOverlayHost: false })
    return {
      model: {
        ...next,
        state,
        view: createView(state, false, false),
      },
      actions,
    }
  }

  if (input.decision.kind === 'pending') {
    const recoveringMode =
      lease && model.state.status !== 'inactive'
        ? model.state.status === 'active' || model.state.status === 'recovering'
          ? model.state.mode
          : input.decision.mode
        : null
    const state: RuntimeState =
      lease && input.decision.videoId === lease.videoId && recoveringMode
        ? {
            status: 'recovering',
            videoId: lease.videoId,
            mode: recoveringMode,
            sourceKind: lease.kind,
          }
        : { status: 'searching', videoId: input.decision.videoId }
    next = {
      ...next,
      state,
      view: createView(state, input.decision.canToggle, input.decision.canToggle || Boolean(lease)),
    }
    if (input.decision.mode === 'archive' && input.decision.canToggle) actions.push({ type: 'open-archive-panel' })
    actions.push({
      type: 'sync-portals',
      showSwitch: input.decision.canToggle,
      showOverlay: input.decision.canToggle || Boolean(lease),
      keepOverlayHost: input.decision.canToggle || Boolean(lease),
    })
    next = scheduleRetry(next, lease, actions)
    return { model: next, actions }
  }

  if (!sourceMatchesLease(input.decision, lease)) {
    if (lease) actions.push({ type: 'release-lease', ensureNativeVisible: false })
    actions.push({ type: 'create-lease', decision: input.decision })
  }
  actions.push({ type: 'initialize-lease', decision: input.decision })
  return { model: next, actions }
}

export const settleRuntimeLeaseInitialization = (
  model: RuntimeModel,
  input: {
    decision: AvailableDecision
    lease: RuntimeLeaseSnapshot | null
    initialized: boolean
  },
): RuntimeModelTransition => {
  const actions: RuntimeModelAction[] = []
  if (input.initialized) {
    const sourceKind = input.lease?.kind ?? 'borrowed'
    const state: RuntimeState = {
      status: 'active',
      videoId: input.decision.videoId,
      mode: input.decision.mode,
      sourceKind,
    }
    const next = resetRetry({ ...model, state, view: createView(state, true, true) }, actions)
    actions.push({ type: 'sync-portals', showSwitch: true, showOverlay: true, keepOverlayHost: true })
    return { model: next, actions }
  }

  const state: RuntimeState = input.lease
    ? {
        status: 'recovering',
        videoId: input.decision.videoId,
        mode: input.decision.mode,
        sourceKind: input.lease.kind,
      }
    : { status: 'searching', videoId: input.decision.videoId }
  let next: RuntimeModel = {
    ...model,
    state,
    view: createView(state, true, true),
  }
  actions.push({ type: 'sync-portals', showSwitch: true, showOverlay: true, keepOverlayHost: true })
  next = scheduleRetry(next, input.lease, actions)
  return { model: next, actions }
}
