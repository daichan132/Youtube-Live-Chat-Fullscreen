import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  type CanaryTestOutcome,
  renderCanarySummary,
  shouldFailCanaryRun,
  summarizeCanaryOutcomes,
} from '../../e2e/reporters/canarySummary'
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

  it('promotes fallback fingerprints to degraded and missing capabilities to failed', () => {
    expect(summarizeCanaryOutcomes([{ ...passed, compatibilityState: 'degraded' }], 'passed').state).toBe('degraded')
    const failed = summarizeCanaryOutcomes([{ ...passed, compatibilityState: 'failed' }], 'passed')

    expect(failed.state).toBe('failed')
    expect(shouldFailCanaryRun(failed)).toBe(true)
    expect(renderCanarySummary([{ ...passed, compatibilityState: 'degraded' }], 'passed')).toContain('compatibility: degraded')
  })

  it('makes an all-skipped canary non-green instead of silently passing', () => {
    const summary = summarizeCanaryOutcomes(
      [
        {
          title: 'archive › replay',
          file: 'e2e/scenarios/archive/liveChatReplay.spec.ts',
          status: 'skipped',
          detail: 'No archive replay URL satisfied preconditions.',
        },
      ],
      'passed',
    )

    expect(summary).toMatchObject({ state: 'not-run', executed: 0, skipped: 1 })
    expect(shouldFailCanaryRun(summary)).toBe(true)
    expect(renderCanarySummary([], 'passed')).toContain('| State | not-run |')
  })

  it('keeps diagnostics after a non-green run on a fixed runner image', () => {
    const workflow = readFileSync(resolve(import.meta.dirname, '../../.github/workflows/canary.yml'), 'utf8')

    expect(workflow).toContain('runs-on: ubuntu-24.04')
    expect(workflow).toContain('if: always()')
    expect(workflow).toContain('playwright-report')
    expect(workflow).toContain('test-results')
  })
})
