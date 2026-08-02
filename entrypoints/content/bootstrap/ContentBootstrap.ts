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

export class ContentBootstrap {
  private session: ContentSession | null = null
  private activation: { token: number; promise: Promise<ContentSession> } | null = null
  private activationToken = 0
  private started = false

  constructor(
    private readonly createSession: () => Promise<ContentSession>,
    private readonly readHref: () => string = () => location.href,
  ) {}

  start() {
    if (this.started) return
    this.started = true
    document.addEventListener('yt-navigate-finish', this.handleLocationSignal)
    window.addEventListener('popstate', this.handleLocationSignal)
    void this.reconcileLocation()
  }

  dispose = () => {
    if (!this.started) return
    this.started = false
    this.activationToken += 1
    this.activation = null
    document.removeEventListener('yt-navigate-finish', this.handleLocationSignal)
    window.removeEventListener('popstate', this.handleLocationSignal)
    this.session?.dispose()
    this.session = null
  }

  reconcileLocation = async () => {
    if (!this.started) return

    if (!isYouTubeWatchSurface(this.readHref())) {
      this.activationToken += 1
      this.activation = null
      this.session?.dispose()
      this.session = null
      return
    }

    if (this.session || this.activation) return

    const token = ++this.activationToken
    const promise = this.createSession()
    this.activation = { token, promise }
    try {
      const session = await promise
      if (!this.started || token !== this.activationToken) {
        session.dispose()
        return
      }
      this.session = session
    } catch {
      // Route activation can fail while YouTube is replacing the watch surface.
    } finally {
      if (this.activation?.token === token) this.activation = null
    }
  }

  private readonly handleLocationSignal = () => {
    void this.reconcileLocation()
  }
}
