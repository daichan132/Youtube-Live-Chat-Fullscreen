import { describe, expect, it } from 'vitest'
import { RuntimeTrace } from './RuntimeTrace'

describe('RuntimeTrace', () => {
  it('keeps only the newest events within its fixed capacity', () => {
    let now = 100
    const trace = new RuntimeTrace(() => now, 2)
    for (const generation of [1, 2, 3]) {
      now += 10
      trace.record({ generation, event: 'session-started', status: 'searching', probeIds: [`player.v1.${generation}`] })
    }

    expect(trace.snapshot()).toEqual([
      expect.objectContaining({ elapsedMs: 20, generation: 2 }),
      expect.objectContaining({ elapsedMs: 30, generation: 3 }),
    ])
  })

  it('returns copies that cannot mutate the stored trace', () => {
    const trace = new RuntimeTrace(() => 0)
    const probeIds = ['player.v1.1']
    trace.record({ generation: 1, event: 'observation-changed', status: 'active', probeIds })
    probeIds.push('secret')

    const first = trace.snapshot()
    const firstEvent = first[0]
    if (!firstEvent) throw new Error('Expected one trace event.')
    ;(firstEvent.probeIds as string[]).push('mutated')

    expect(trace.snapshot().at(0)?.probeIds).toEqual(['player.v1.1'])
  })
})
