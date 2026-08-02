import type { RuntimeFailureCode } from './failureCodes'

export const MAX_DIAGNOSTIC_EVENTS = 128

export type DiagnosticEventName =
  | 'session-started'
  | 'observation-changed'
  | 'plan-changed'
  | 'lease-acquired'
  | 'lease-restoring'
  | 'lease-released'
  | 'retry-scheduled'
  | 'recovered'
  | 'failed'

export type DiagnosticEvent = {
  elapsedMs: number
  generation: number
  event: DiagnosticEventName
  status: 'inactive' | 'searching' | 'active' | 'recovering' | 'unavailable'
  probeIds: readonly string[]
  failureCode?: RuntimeFailureCode
}

type TraceInput = Omit<DiagnosticEvent, 'elapsedMs'>

export class RuntimeTrace {
  private readonly startedAt: number
  private readonly events: DiagnosticEvent[] = []

  constructor(
    private readonly now: () => number = () => performance.now(),
    private readonly capacity = MAX_DIAGNOSTIC_EVENTS,
  ) {
    this.startedAt = now()
  }

  record(input: TraceInput) {
    const event: DiagnosticEvent = {
      ...input,
      elapsedMs: Math.max(0, Math.round(this.now() - this.startedAt)),
      probeIds: [...input.probeIds],
    }
    this.events.push(event)
    if (this.events.length > this.capacity) this.events.splice(0, this.events.length - this.capacity)
  }

  snapshot(): readonly DiagnosticEvent[] {
    return this.events.map(event => ({ ...event, probeIds: [...event.probeIds] }))
  }
}
