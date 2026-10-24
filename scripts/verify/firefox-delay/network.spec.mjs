import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { requireNativeObservation } from './cycle.mjs'
import { startSlowWatchdog } from './watchdog.mjs'
import { NetworkJournal, classify } from './network.mjs'
import { parseOptions, isTemporaryBinary } from '../record-firefox-chat-delay.mjs'
const directories = []
afterEach(async () => {
  for (const d of directories.splice(0)) await rm(d, { recursive: true, force: true })
})
async function journal(options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'ylc-network-contract-'))
  directories.push(dir)
  const path = join(dir, 'network.jsonl')
  return {
    journal: new NetworkJournal(path, options),
    rows: async () => (await readFile(path, 'utf8')).trim().split('\n').map(JSON.parse),
    path,
  }
}
const event = (
  method,
  {
    id = 'opaque-private-id',
    url = 'https://www.gstatic.com/external_hosted/lottie/lottie_light.js?private=secret',
    timestamp = 1000,
    redirectCount = 0,
    ...params
  } = {},
) => ({
  method,
  params: {
    timestamp,
    redirectCount,
    request: {
      request: id,
      url,
      headers: [{ name: 'cookie', value: { value: 'private-cookie' } }],
      body: 'private-message',
      timings: { responseEnd: 9000, url: 'private-timing-url' },
    },
    ...params,
  },
})

describe('natural Firefox network capture', () => {
  it('preserves a pending slow request and its later completion without source identity or contents', async () => {
    let now = 1000
    const f = await journal({ now: () => now })
    f.journal.mark('fullscreen-exit', 3)
    f.journal.receive(event('network.beforeRequestSent'))
    now += 5100
    const pending = f.journal.snapshot()
    expect(pending.pending).toEqual([
      { request: 1, kind: 'lottie-script', startedMs: 0, startedTrial: 3, startedPhase: 'fullscreen-exit', elapsedMs: 5100 },
    ])
    now += 3000
    f.journal.receive(
      event('network.responseStarted', { response: { status: 200, headers: ['private-response-cookie'], fromCache: false } }),
    )
    f.journal.receive(event('network.responseCompleted', { response: { status: 200, bytesReceived: 12345 } }))
    expect(f.journal.snapshot().pending).toHaveLength(0)
    await f.journal.close()
    const rows = await f.rows(),
      serialized = JSON.stringify({ rows, pending })
    expect(rows.find(x => x.event === 'responseCompleted')).toMatchObject({
      kind: 'lottie-script',
      elapsedMs: 8100,
      status: 200,
      bytesReceived: 12345,
      timings: { responseEnd: 9000 },
    })
    for (const secret of [
      'https:',
      'opaque-private-id',
      'private-cookie',
      'private-message',
      'private-response-cookie',
      'private-timing-url',
      'secret',
    ])
      expect(serialized).not.toContain(secret)
  })
  it('keeps start ownership when requests complete in a later trial', async () => {
    const f = await journal()
    f.journal.mark('navigate', 1)
    f.journal.receive(event('network.beforeRequestSent'))
    f.journal.mark('fullscreen-exit', 2)
    f.journal.receive(event('network.fetchError'))
    await f.journal.close()
    expect((await f.rows()).find(x => x.event === 'fetchError')).toMatchObject({ trial: 2, startedTrial: 1, startedPhase: 'navigate' })
  })
  it('does not confuse redirected requests with late terminal events from the previous hop', async () => {
    const f = await journal()
    f.journal.receive(event('network.beforeRequestSent'))
    f.journal.receive(event('network.beforeRequestSent', { redirectCount: 1 }))
    f.journal.receive(event('network.responseCompleted'))
    expect(f.journal.snapshot().pending.map(x => x.request)).toEqual([2])
    f.journal.receive(event('network.responseCompleted', { redirectCount: 1 }))
    await f.journal.close()
  })
  it('reports an integrity failure instead of silently dropping an unbounded number of pending requests', async () => {
    const f = await journal({ maxPending: 1 })
    f.journal.receive(event('network.beforeRequestSent', { id: 'first' }))
    f.journal.receive(event('network.beforeRequestSent', { id: 'second' }))
    expect(f.journal.snapshot().fatal).toBe('network-journal-pending-limit')
    expect(f.journal.snapshot().pending).toHaveLength(1)
    await expect(f.journal.close()).rejects.toThrow('network-journal-pending-limit')
  })
  it('classifies native chat and static assets without retaining query tokens', () => {
    expect(classify('https://www.youtube.com/live_chat?continuation=private')).toBe('chat-document')
    expect(classify('https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?key=private')).toBe('chat-api')
    expect(classify('https://www.youtube.com/s/live_chat/version/live_chat_polymer.js')).toBe('chat-bootstrap-script')
    expect(classify('not a url')).toBe('other')
  })
  it('requires a temporary binary and bounded observation options', () => {
    expect(isTemporaryBinary('/Applications/Firefox.app/Contents/MacOS/firefox', ['/private/tmp'])).toBe(false)
    expect(isTemporaryBinary('/private/tmp/owned/Firefox.app/firefox', ['/private/tmp'])).toBe(true)
    expect(() => parseOptions(['--firefox', '/tmp/f', '--extension', '/tmp/e', '--out', '/tmp/new', '--minutes', '0'])).toThrow()
    expect(parseOptions(['--firefox', '/tmp/f', '--extension', '/tmp/e', '--out', '/tmp/new'])).toMatchObject({
      minutes: 10,
      cycles: 40,
      slowMs: 5000,
    })
  })
})

describe('slow case watchdog', () => {
  it('captures pending traffic even while a browser response remains unresolved', async () => {
    vi.useFakeTimers()
    try {
      const saved = []
      const record = { slowMs: 5000, exitStartedEpochMs: Date.now(), slow: false }
      const watchdog = startSlowWatchdog({
        record,
        journal: { mark() {}, snapshot: () => ({ pending: [{ request: 1, kind: 'lottie-script', elapsedMs: 5000 }] }) },
        latest: () => null,
        save: async () => saved.push(structuredClone(record)),
      })
      await vi.advanceTimersByTimeAsync(5000)
      expect(saved).toHaveLength(1)
      expect(saved[0]).toMatchObject({
        slow: true,
        atSlow: { detectedMs: 5000, browserStateUnavailable: true, network: { pending: [{ kind: 'lottie-script' }] } },
      })
      await watchdog.stop()
    } finally {
      vi.useRealTimers()
    }
  })
  it('does not label the stability observation after an already recovered browser as slow', async () => {
    vi.useFakeTimers()
    try {
      let saves = 0
      const record = { slowMs: 5000, exitStartedEpochMs: Date.now(), slow: false }
      const watchdog = startSlowWatchdog({
        record,
        journal: { mark() {}, snapshot: () => ({}) },
        latest: () => ({ ready: true, sample: { ms: 4600 } }),
        save: async () => {
          saves++
        },
      })
      await vi.advanceTimersByTimeAsync(5000)
      expect(saves).toBe(0)
      expect(record.slow).toBe(false)
      await watchdog.stop()
    } finally {
      vi.useRealTimers()
    }
  })
})

it('rejects an unavailable browser observation before a slow-case timer can be armed', () => {
  expect(() => requireNativeObservation({ nativeConnected: false, renderer: false, nativeRules: 0 })).toThrow()
  expect(() => requireNativeObservation({ nativeConnected: true, renderer: true, nativeRules: 14945 })).not.toThrow()
})
