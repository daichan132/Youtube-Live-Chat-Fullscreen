import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { runCycle } from './cycle.mjs'

describe('Firefox recovery trial ownership', () => {
  it.each(['rapid', 'steady'])('rejects %s entry when the native iframe was never borrowed', async entry => {
    await trial(entry, false)
  })
  it('measures recovery after the original native iframe was actually borrowed', async () => {
    await trial('rapid', true)
  })
})

async function trial(entry, borrowed) {
  const out = await mkdtemp(join(tmpdir(), 'ylc-cycle-contract-'))
  vi.useFakeTimers()
  const native = {
    fullscreen: false,
    nativeConnected: true,
    parentRestored: true,
    nativeHostHasOriginal: true,
    overlayHasOriginal: false,
    renderer: true,
    nativeRules: 14945,
    generation: 0,
    blank: false,
    extensionClass: false,
    extensionStyles: 0,
  }
  let stateReads = 0
  const key = vi.fn(async () => {})
  const api = {
    marionette: async () => {},
    key,
    click: async () => {},
    delay: async ms => {
      await vi.advanceTimersByTimeAsync(ms)
    },
    execute: async script => (script.includes('getBoundingClientRect') ? { x: 0, y: 0, width: 40, height: 40 } : true),
    cmd: async () => ({ contexts: [{ context: 'owned-tab' }] }),
    evaluate: async (_, expression) => {
      let result = true
      if (expression.includes('isLiveNow')) result = { live: true, playable: true }
      else if (expression.includes('Observation reference unavailable')) {
        stateReads++
        result =
          stateReads === 2
            ? {
                ...native,
                fullscreen: true,
                parentRestored: !borrowed,
                nativeHostHasOriginal: !borrowed,
                overlayHasOriginal: borrowed,
                extensionClass: borrowed,
                extensionStyles: borrowed ? 1 : 0,
              }
            : native
      } else if (expression.includes('getEntriesByType')) result = {}
      return { value: JSON.stringify(result) }
    },
  }
  try {
    const record = await runCycle(
      api,
      { sequence: 0, mark() {}, snapshot: () => ({ pending: [] }) },
      {
        url: 'https://www.youtube.com/watch?v=fixture',
        out,
        index: 1,
        entry,
      },
    )
    expect(key).toHaveBeenCalledOnce()
    expect(record.outcome).toBe(borrowed ? 'recovered' : 'entry-not-borrowed')
    if (!borrowed) {
      expect(record.recoveryMs).toBeUndefined()
      expect(record.samples).toEqual([])
      expect(record.slow).toBe(false)
    }
    expect(JSON.parse(await readFile(join(out, 'trial-001.json'), 'utf8')).outcome).toBe(record.outcome)
  } finally {
    vi.useRealTimers()
    await rm(out, { recursive: true, force: true })
  }
}
