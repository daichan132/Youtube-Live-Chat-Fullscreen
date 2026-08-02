import type { ChatDecision } from './resolveChatDecision'

export type RuntimeState =
  | { status: 'inactive'; reason: 'disabled' | 'not-watch-page' | 'not-fullscreen' }
  | { status: 'searching'; videoId: string | null }
  | { status: 'active'; videoId: string; mode: 'live' | 'archive'; sourceKind: 'borrowed' | 'managed' }
  | { status: 'recovering'; videoId: string; mode: 'live' | 'archive'; sourceKind: 'borrowed' | 'managed' }
  | { status: 'unavailable'; videoId: string }

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
type Preserve = { kind: 'preserve' }

export type RuntimePlan = {
  monitoring: 'preserve' | 'active' | 'inactive'
  presentation: 'preserve' | 'none' | 'switch-only' | 'overlay-only' | 'overlay-and-switch'
  chat: Preserve | { kind: 'none'; ensureNativeVisible: boolean } | { kind: 'acquire'; decision: AvailableDecision }
  layout: 'preserve' | 'none' | 'floating'
  retry: Preserve | { kind: 'none' } | { kind: 'scheduled'; delayMs: number }
  openArchivePanel?: true
}

export type RuntimeModelTransition = { model: RuntimeModel; plan: RuntimePlan }

export const RETRY_DELAYS_MS = [250, 500, 1000, 2000, 5000] as const
export const MAX_RETRY_ATTEMPTS = 12

const inactiveView: RuntimeModelView = {
  status: 'inactive',
  mode: null,
  showSwitch: false,
  showOverlay: false,
  loading: false,
}

const createPlan = (overrides: Partial<RuntimePlan> = {}): RuntimePlan => ({
  monitoring: 'preserve',
  presentation: 'preserve',
  chat: { kind: 'preserve' },
  layout: 'preserve',
  retry: { kind: 'preserve' },
  ...overrides,
})

const presentationFor = (showSwitch: boolean, showOverlay: boolean): RuntimePlan['presentation'] => {
  if (showSwitch && showOverlay) return 'overlay-and-switch'
  if (showSwitch) return 'switch-only'
  if (showOverlay) return 'overlay-only'
  return 'none'
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

const resetRetry = (model: RuntimeModel, plan: RuntimePlan) => {
  if (model.retryPending) plan.retry = { kind: 'none' }
  return { ...model, retryAttempts: 0, retryPending: false }
}

const ensureMonitoring = (model: RuntimeModel, plan: RuntimePlan) => {
  if (model.observing) return model
  plan.monitoring = 'active'
  return { ...model, observing: true }
}

const scheduleRetry = (model: RuntimeModel, lease: RuntimeLeaseSnapshot | null, plan: RuntimePlan): RuntimeModel => {
  if (model.retryPending) return model
  if (model.retryAttempts >= MAX_RETRY_ATTEMPTS) {
    if (lease) plan.chat = { kind: 'none', ensureNativeVisible: false }
    plan.presentation = 'none'
    plan.layout = 'none'
    if ((model.state.status !== 'searching' && model.state.status !== 'recovering') || !model.state.videoId) return model
    const state: RuntimeState = { status: 'unavailable', videoId: model.state.videoId }
    return { ...model, state, view: createView(state, false, false) }
  }
  const delayMs = RETRY_DELAYS_MS[Math.min(model.retryAttempts, RETRY_DELAYS_MS.length - 1)]
  plan.retry = { kind: 'scheduled', delayMs }
  return { ...model, retryAttempts: model.retryAttempts + 1, retryPending: true }
}

export const resetRuntimeRetry = (model: RuntimeModel): RuntimeModelTransition => {
  const plan = createPlan()
  return { model: resetRetry(model, plan), plan }
}

export const markRuntimeRetryFired = (model: RuntimeModel): RuntimeModel => ({ ...model, retryPending: false })

export const stopRuntimeModel = (model: RuntimeModel, lease: RuntimeLeaseSnapshot | null): RuntimeModelTransition => ({
  model: createInitialRuntimeModel(),
  plan: createPlan({
    monitoring: 'inactive',
    presentation: 'none',
    chat: lease ? { kind: 'none', ensureNativeVisible: false } : { kind: 'preserve' },
    layout: 'none',
    retry: model.retryPending ? { kind: 'none' } : { kind: 'preserve' },
  }),
})

export const transitionRuntimeModel = (
  model: RuntimeModel,
  input: { enabled: boolean; decision: ChatDecision; lease: RuntimeLeaseSnapshot | null },
): RuntimeModelTransition => {
  const plan = createPlan()
  let next = model
  let lease = input.lease

  if (input.decision.kind === 'inactive') {
    const ensureNativeVisible =
      input.decision.reason === 'not-fullscreen' &&
      (model.state.status === 'active' || model.state.status === 'recovering') &&
      model.state.mode === 'archive'
    plan.chat = lease ? { kind: 'none', ensureNativeVisible } : { kind: 'preserve' }
    plan.presentation = 'none'
    plan.layout = 'none'
    if (next.observing) plan.monitoring = 'inactive'
    next = resetRetry(next, plan)
    return {
      model: { ...next, state: { status: 'inactive', reason: input.decision.reason }, view: inactiveView, observing: false },
      plan,
    }
  }

  next = ensureMonitoring(next, plan)

  if (!input.enabled) {
    const showSwitch = input.decision.kind === 'available' || (input.decision.kind === 'pending' && input.decision.canToggle)
    const ensureNativeVisible = (model.state.status === 'active' || model.state.status === 'recovering') && model.state.mode === 'archive'
    plan.chat = lease ? { kind: 'none', ensureNativeVisible } : { kind: 'preserve' }
    plan.layout = 'none'
    plan.presentation = presentationFor(showSwitch, false)
    next = resetRetry(next, plan)
    const state: RuntimeState = { status: 'inactive', reason: 'disabled' }
    return { model: { ...next, state, view: createView(state, showSwitch, false) }, plan }
  }

  if (lease && input.decision.videoId !== lease.videoId) {
    plan.chat = { kind: 'none', ensureNativeVisible: false }
    lease = null
    next = resetRetry(next, plan)
  }

  if (input.decision.kind === 'unavailable') {
    if (lease) plan.chat = { kind: 'none', ensureNativeVisible: false }
    next = resetRetry(next, plan)
    const state: RuntimeState = { status: 'unavailable', videoId: input.decision.videoId }
    plan.presentation = 'none'
    plan.layout = 'none'
    return { model: { ...next, state, view: createView(state, false, false) }, plan }
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
        ? { status: 'recovering', videoId: lease.videoId, mode: recoveringMode, sourceKind: lease.kind }
        : { status: 'searching', videoId: input.decision.videoId }
    const showOverlay = input.decision.canToggle || Boolean(lease)
    next = { ...next, state, view: createView(state, input.decision.canToggle, showOverlay) }
    plan.presentation = presentationFor(input.decision.canToggle, showOverlay)
    plan.layout = showOverlay ? 'floating' : 'none'
    if (input.decision.mode === 'archive' && input.decision.canToggle) plan.openArchivePanel = true
    next = scheduleRetry(next, lease, plan)
    return { model: next, plan }
  }

  plan.presentation = 'overlay-and-switch'
  plan.layout = 'floating'
  plan.chat = { kind: 'acquire', decision: input.decision }
  return { model: next, plan }
}

export const settleRuntimeLeaseInitialization = (
  model: RuntimeModel,
  input: { decision: AvailableDecision; lease: RuntimeLeaseSnapshot | null; initialized: boolean },
): RuntimeModelTransition => {
  const plan = createPlan({ presentation: 'overlay-and-switch', layout: 'floating' })
  if (input.initialized) {
    const state: RuntimeState = {
      status: 'active',
      videoId: input.decision.videoId,
      mode: input.decision.mode,
      sourceKind: input.lease?.kind ?? 'borrowed',
    }
    const next = resetRetry({ ...model, state, view: createView(state, true, true) }, plan)
    return { model: next, plan }
  }

  const state: RuntimeState = input.lease
    ? {
        status: 'recovering',
        videoId: input.decision.videoId,
        mode: input.decision.mode,
        sourceKind: input.lease.kind,
      }
    : { status: 'searching', videoId: input.decision.videoId }
  let next: RuntimeModel = { ...model, state, view: createView(state, true, true) }
  next = scheduleRetry(next, input.lease, plan)
  return { model: next, plan }
}
