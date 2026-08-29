export type ContentSession = {
  dispose(): void
}

export const isYouTubeWatchSurface = (href: string) => {
  try {
    return new URL(href).pathname === '/watch'
  } catch {
    return false
  }
}

const RETRY_DELAYS_MS = [250, 1000] as const

type Timer = ReturnType<typeof setTimeout>

type BootstrapScheduler = {
  setTimeout: (callback: () => void, delayMs: number) => Timer
  clearTimeout: (timer: Timer) => void
}

const defaultScheduler: BootstrapScheduler = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: timer => clearTimeout(timer),
}

export class ContentBootstrap {
  private session: ContentSession | null = null
  private activation: { token: number; promise: Promise<ContentSession> } | null = null
  private activationToken = 0
  private retryTimer: Timer | null = null
  private retryAttempt = 0
  private started = false

  constructor(
    private readonly createSession: () => Promise<ContentSession>,
    private readonly readHref: () => string = () => location.href,
    private readonly scheduler: BootstrapScheduler = defaultScheduler,
  ) {}

  start() {
    if (this.started) return
    this.started = true
    void this.reconcileLocation()
  }

  dispose = () => {
    if (!this.started) return
    this.started = false
    this.activationToken += 1
    this.activation = null
    this.cancelRetry()
    this.session?.dispose()
    this.session = null
  }

  reconcileLocation = async (href = this.readHref()) => {
    if (!this.started) return
    this.cancelRetry()

    if (!isYouTubeWatchSurface(href)) {
      this.activationToken += 1
      this.activation = null
      this.retryAttempt = 0
      this.session?.dispose()
      this.session = null
      return
    }

    if (this.session || this.activation) return

    const token = ++this.activationToken
    const promise = this.createSession()
    this.activation = { token, promise }
    let shouldRetry = false
    try {
      const session = await promise
      if (!this.started || token !== this.activationToken || !isYouTubeWatchSurface(this.readHref())) {
        session.dispose()
        return
      }
      this.session = session
      this.retryAttempt = 0
    } catch {
      shouldRetry = this.started && token === this.activationToken && isYouTubeWatchSurface(this.readHref())
    } finally {
      if (this.activation?.token === token) this.activation = null
    }

    if (shouldRetry) this.scheduleRetry()
  }

  private scheduleRetry() {
    const delay = RETRY_DELAYS_MS[this.retryAttempt]
    if (delay === undefined || this.retryTimer !== null || !this.started) return
    this.retryAttempt += 1
    this.retryTimer = this.scheduler.setTimeout(() => {
      this.retryTimer = null
      void this.reconcileLocation()
    }, delay)
  }

  private cancelRetry() {
    if (this.retryTimer === null) return
    this.scheduler.clearTimeout(this.retryTimer)
    this.retryTimer = null
  }
}
