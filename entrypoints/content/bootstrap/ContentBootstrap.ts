import { getYouTubeContentSurface, type YouTubeContentSurface } from '../platform/youtube/youtubeSurface'

export type ContentSession = {
  dispose(): void
}

export type ContentBootstrapFailure = {
  code: 'CONTENT_SESSION_START_FAILED'
  route: 'watch' | 'live'
  attempts: number
}

export const isYouTubeWatchSurface = (href: string) => getYouTubeContentSurface(href)?.route === 'watch'

const RETRY_DELAYS_MS = [250, 1000] as const

type Timer = ReturnType<typeof setTimeout>

type BootstrapScheduler = {
  setTimeout: (callback: () => void, delayMs: number) => Timer
  clearTimeout: (timer: Timer) => void
}

type ContentBootstrapOptions = {
  readHref?: () => string
  scheduler?: BootstrapScheduler
  onPermanentFailure?: (failure: ContentBootstrapFailure) => void
}

type ReconcileLocationOptions = {
  navigationCompleted?: boolean
}

const defaultScheduler: BootstrapScheduler = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: timer => clearTimeout(timer),
}

const canRetryFailedSurfaceAfterNavigation = (surface: YouTubeContentSurface) => surface.route === 'live' && surface.videoId === null

export class ContentBootstrap {
  private readonly readHref: () => string
  private readonly scheduler: BootstrapScheduler
  private readonly onPermanentFailure: (failure: ContentBootstrapFailure) => void
  private session: ContentSession | null = null
  private activation: { token: number; promise: Promise<ContentSession> } | null = null
  private activationToken = 0
  private surfaceKey: string | null = null
  private failedSurfaceKey: string | null = null
  private retryTimer: Timer | null = null
  private retryAttempt = 0
  private started = false

  constructor(
    private readonly createSession: () => Promise<ContentSession>,
    options: ContentBootstrapOptions = {},
  ) {
    this.readHref = options.readHref ?? (() => location.href)
    this.scheduler = options.scheduler ?? defaultScheduler
    this.onPermanentFailure = options.onPermanentFailure ?? (() => {})
  }

  start() {
    if (this.started) return
    this.started = true
    void this.reconcileLocation()
  }

  dispose = () => {
    if (!this.started) return
    this.started = false
    this.transitionSurface(null)
    this.session?.dispose()
    this.session = null
  }

  reconcileLocation = async (href = this.readHref(), options: ReconcileLocationOptions = {}) => {
    if (!this.started) return
    const surface = getYouTubeContentSurface(href)

    if (!surface) {
      this.transitionSurface(null)
      this.session?.dispose()
      this.session = null
      return
    }

    this.transitionSurface(surface.activationKey)
    if (options.navigationCompleted && canRetryFailedSurfaceAfterNavigation(surface) && this.failedSurfaceKey === surface.activationKey) {
      this.failedSurfaceKey = null
      this.retryAttempt = 0
    }
    if (this.session || this.activation || this.retryTimer !== null || this.failedSurfaceKey === surface.activationKey) return

    const token = ++this.activationToken
    const promise = Promise.resolve().then(() => this.createSession())
    this.activation = { token, promise }
    let shouldRetry = false
    try {
      const session = await promise
      const currentSurface = getYouTubeContentSurface(this.readHref())
      if (!this.started || token !== this.activationToken || currentSurface?.activationKey !== surface.activationKey) {
        session.dispose()
        return
      }
      this.session = session
      this.retryAttempt = 0
      this.failedSurfaceKey = null
    } catch {
      const currentSurface = getYouTubeContentSurface(this.readHref())
      shouldRetry = this.started && token === this.activationToken && currentSurface?.activationKey === surface.activationKey
    } finally {
      if (this.activation?.token === token) this.activation = null
    }

    if (shouldRetry) this.scheduleRetry(surface)
  }

  private transitionSurface(nextSurfaceKey: string | null) {
    if (this.surfaceKey === nextSurfaceKey) return
    this.surfaceKey = nextSurfaceKey
    this.activationToken += 1
    this.activation = null
    this.cancelRetry()
    this.retryAttempt = 0
    this.failedSurfaceKey = null
  }

  private scheduleRetry(surface: YouTubeContentSurface) {
    const delay = RETRY_DELAYS_MS[this.retryAttempt]
    if (delay === undefined) {
      if (this.failedSurfaceKey === surface.activationKey) return
      this.failedSurfaceKey = surface.activationKey
      this.onPermanentFailure({
        code: 'CONTENT_SESSION_START_FAILED',
        route: surface.route,
        attempts: RETRY_DELAYS_MS.length + 1,
      })
      return
    }
    if (this.retryTimer !== null || !this.started || this.surfaceKey !== surface.activationKey) return
    this.retryAttempt += 1
    this.retryTimer = this.scheduler.setTimeout(() => {
      this.retryTimer = null
      if (this.surfaceKey !== surface.activationKey) return
      void this.reconcileLocation()
    }, delay)
  }

  private cancelRetry() {
    if (this.retryTimer === null) return
    this.scheduler.clearTimeout(this.retryTimer)
    this.retryTimer = null
  }
}
