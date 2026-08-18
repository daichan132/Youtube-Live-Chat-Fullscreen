import { describe, expect, it } from 'vitest'
import { classifyReleaseCanary } from './classify-release-canary.mjs'

const payload = summary => ({ summary })

describe('classifyReleaseCanary', () => {
  it('accepts only a clean, executed canary as passed', () => {
    expect(classifyReleaseCanary(payload({ state: 'passed', executed: 5, passed: 5, flaky: 0, skipped: 0, failed: 0 }), 0)).toBe('passed')
  })

  it('classifies an all-skipped run as externally unavailable', () => {
    expect(classifyReleaseCanary(payload({ state: 'not-run', executed: 0, passed: 0, flaky: 0, skipped: 5, failed: 0 }), 1)).toBe(
      'unavailable',
    )
  })

  it.each([
    [{ state: 'degraded', executed: 4, passed: 4, flaky: 0, skipped: 1, failed: 0 }, 0],
    [{ state: 'failed', executed: 5, passed: 4, flaky: 0, skipped: 0, failed: 1 }, 1],
    [{ state: 'passed', executed: 5, passed: 5, flaky: 0, skipped: 0, failed: 0 }, 1],
  ])('rejects partial or product-owned failures', (summary, exitCode) => {
    expect(() => classifyReleaseCanary(payload(summary), exitCode)).toThrow('neither clean nor externally unavailable')
  })
})
