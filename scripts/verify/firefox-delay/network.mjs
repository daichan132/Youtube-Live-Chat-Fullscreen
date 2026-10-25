import { createWriteStream } from 'node:fs'
import { once } from 'node:events'

const timingKeys = [
  'timeOrigin',
  'requestTime',
  'redirectStart',
  'redirectEnd',
  'fetchStart',
  'dnsStart',
  'dnsEnd',
  'connectStart',
  'connectEnd',
  'tlsStart',
  'requestStart',
  'responseStart',
  'responseEnd',
]
const numeric = value => (typeof value === 'number' && Number.isFinite(value) ? value : null)
export function classify(raw) {
  try {
    const u = new URL(raw),
      p = u.pathname.toLowerCase(),
      host = u.hostname
    if (host === 'www.youtube.com') {
      if (p === '/live_chat' || p === '/live_chat_replay') return 'chat-document'
      if (p.startsWith('/youtubei/v1/live_chat/')) return 'chat-api'
      if (p.includes('live_chat') && p.endsWith('.js')) return 'chat-bootstrap-script'
      if (p === '/watch' || p.startsWith('/live/')) return 'watch-document'
      if (p.endsWith('.js')) return 'youtube-script'
      return 'youtube-other'
    }
    if (host.endsWith('.gstatic.com') || host === 'gstatic.com')
      return p.includes('/external_hosted/lottie/') ? 'lottie-script' : 'google-static'
    if (host.endsWith('.googlevideo.com')) return 'video-media'
    if (host.endsWith('.googleapis.com')) return 'google-api'
    return 'other'
  } catch {
    return 'other'
  }
}
export class NetworkJournal {
  constructor(filename, { now = Date.now, maxPending = 2048 } = {}) {
    this.now = now
    this.epoch = now()
    this.maxPending = maxPending
    this.pending = new Map()
    this.sequence = 0
    this.requestSequence = 0
    this.phase = 'startup'
    this.trial = 0
    this.fatal = null
    this.closed = false
    this.stream = createWriteStream(filename, { flags: 'wx', mode: 0o600 })
    this.stream.on('error', () => {
      this.fatal = 'network-journal-write-failed'
    })
    this.write({ event: 'journal-start', naturalRequestsOnly: true })
  }
  write(value) {
    if (this.closed || this.fatal) return
    if (this.stream.writableLength > 4 * 1024 * 1024) {
      this.fatal = 'network-journal-backpressure-limit'
      return
    }
    this.stream.write(
      JSON.stringify({ sequence: ++this.sequence, receivedMs: this.now() - this.epoch, trial: this.trial, phase: this.phase, ...value }) +
        '\n',
    )
  }
  mark(phase, trial = this.trial) {
    this.phase = phase
    this.trial = trial
    this.write({ event: 'phase' })
  }
  receive(message) {
    if (
      !['network.beforeRequestSent', 'network.responseStarted', 'network.responseCompleted', 'network.fetchError'].includes(message.method)
    )
      return
    const p = message.params,
      request = p?.request,
      id = request?.request ? `${request.request}:${p.redirectCount ?? 0}` : null
    if (!id || this.fatal) return
    let item = this.pending.get(id)
    if (message.method === 'network.beforeRequestSent') {
      if (!item && this.pending.size >= this.maxPending) {
        this.fatal = 'network-journal-pending-limit'
        return
      }
      // IDs/URLs are private lookup keys only; never copy protocol objects to disk.
      item = {
        request: ++this.requestSequence,
        kind: classify(request.url),
        startedMs: this.now() - this.epoch,
        startedTrial: this.trial,
        startedPhase: this.phase,
      }
      this.pending.set(id, item)
    }
    if (!item) return
    const timings = Object.fromEntries(timingKeys.filter(k => numeric(request.timings?.[k]) !== null).map(k => [k, request.timings[k]]))
    this.write({
      event: message.method.split('.').at(-1),
      ...item,
      browserEventMs: numeric(p.timestamp) === null ? null : p.timestamp - this.epoch,
      elapsedMs: this.now() - this.epoch - item.startedMs,
      status: numeric(p.response?.status),
      fromCache: typeof p.response?.fromCache === 'boolean' ? p.response.fromCache : null,
      bytesReceived: numeric(p.response?.bytesReceived),
      timings,
    })
    if (['network.responseCompleted', 'network.fetchError'].includes(message.method)) this.pending.delete(id)
  }
  snapshot() {
    return {
      sequence: this.sequence,
      phase: this.phase,
      trial: this.trial,
      fatal: this.fatal,
      pending: [...this.pending.values()].map(v => ({ ...v, elapsedMs: this.now() - this.epoch - v.startedMs })),
    }
  }
  async close() {
    if (this.closed) return
    this.write({ event: 'journal-end', pendingCount: this.pending.size, integrityError: this.fatal })
    this.closed = true
    this.stream.end()
    if (!this.stream.writableFinished && !this.stream.destroyed)
      await Promise.race([once(this.stream, 'finish'), once(this.stream, 'error')]).catch(() => {})
    if (this.fatal) throw new Error(this.fatal)
  }
}
