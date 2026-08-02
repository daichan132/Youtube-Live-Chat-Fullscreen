export type SessionScope = {
  readonly generation: number
  readonly signal: AbortSignal
  setTimeout(callback: () => void, delayMs: number): number
  clearTimeout(timer: number): void
  requestAnimationFrame(callback: FrameRequestCallback): number
  cancelAnimationFrame(frame: number): void
  listen(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject): () => void
  addCleanup(cleanup: () => void): () => void
  dispose(): void
}

export const createSessionScope = (generation: number): SessionScope => {
  const controller = new AbortController()
  const timers = new Set<number>()
  const frames = new Set<number>()

  return {
    generation,
    signal: controller.signal,
    setTimeout(callback, delayMs) {
      const timer = window.setTimeout(() => {
        timers.delete(timer)
        if (!controller.signal.aborted) callback()
      }, delayMs)
      timers.add(timer)
      return timer
    },
    clearTimeout(timer) {
      if (!timers.delete(timer)) return
      window.clearTimeout(timer)
    },
    requestAnimationFrame(callback) {
      const frame = window.requestAnimationFrame(timestamp => {
        frames.delete(frame)
        if (!controller.signal.aborted) callback(timestamp)
      })
      frames.add(frame)
      return frame
    },
    cancelAnimationFrame(frame) {
      if (!frames.delete(frame)) return
      window.cancelAnimationFrame(frame)
    },
    listen(target, type, listener) {
      if (controller.signal.aborted) return () => {}
      target.addEventListener(type, listener, { signal: controller.signal })
      const cleanup = () => target.removeEventListener(type, listener)
      return cleanup
    },
    addCleanup(cleanup) {
      if (controller.signal.aborted) {
        cleanup()
        return () => {}
      }
      controller.signal.addEventListener('abort', cleanup, { once: true })
      return () => controller.signal.removeEventListener('abort', cleanup)
    },
    dispose() {
      if (controller.signal.aborted) return
      controller.abort()
      for (const timer of timers) window.clearTimeout(timer)
      timers.clear()
      for (const frame of frames) window.cancelAnimationFrame(frame)
      frames.clear()
    },
  }
}
