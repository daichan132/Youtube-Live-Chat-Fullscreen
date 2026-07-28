import { describe, expect, it } from 'vitest'
import { type CanaryTestOutcome, renderCanarySummary, summarizeCanaryOutcomes } from '../../e2e/reporters/canarySummary'
import playwrightConfig from '../../playwright.config'

const passed: CanaryTestOutcome = {
  title: 'live › auto open',
  file: 'e2e/scenarios/live/fullscreenChatAutoOpen.spec.ts',
  status: 'passed',
}

describe('Real YouTube canary summary', () => {
  it('is wired into the Playwright reporter pipeline', () => {
    expect(playwrightConfig.reporter).toContainEqual(['./e2e/reporters/canarySummary.ts'])
  })

  it('reports a fully executed successful run', () => {
    expect(summarizeCanaryOutcomes([passed], 'passed')).toEqual({
      state: 'passed',
      executed: 1,
      passed: 1,
      flaky: 0,
      skipped: 0,
      failed: 0,
    })
  })

  it('marks an otherwise successful run with external skips as degraded', () => {
    const outcomes: CanaryTestOutcome[] = [
      passed,
      {
        title: 'archive › replay',
        file: 'e2e/scenarios/archive/liveChatReplay.spec.ts',
        status: 'skipped',
        detail: 'No archive replay URL satisfied preconditions.',
      },
    ]

    expect(summarizeCanaryOutcomes(outcomes, 'passed')).toMatchObject({
      state: 'degraded',
      executed: 1,
      skipped: 1,
      failed: 0,
    })
    expect(renderCanarySummary(outcomes, 'passed')).toContain('| State | degraded |')
    expect(renderCanarySummary(outcomes, 'passed')).toContain('No archive replay URL satisfied preconditions.')
  })

  it('reports extension assertion failures as failed rather than degraded', () => {
    expect(
      summarizeCanaryOutcomes(
        [
          {
            title: 'live › native closed fallback',
            file: 'e2e/scenarios/live/nativeChatClosedExtensionLoads.spec.ts',
            status: 'failed',
          },
        ],
        'failed',
      ),
    ).toMatchObject({
      state: 'failed',
      executed: 1,
      skipped: 0,
      failed: 1,
    })
  })
})
