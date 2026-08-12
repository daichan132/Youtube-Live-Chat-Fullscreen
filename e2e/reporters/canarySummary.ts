import { appendFile } from 'node:fs/promises'
import type { FullResult, Reporter, Suite } from '@playwright/test/reporter'
import { CANARY_PROJECT_NAME } from '../config/projectClassification'

export type CanaryTestOutcome = {
  title: string
  file: string
  status: 'passed' | 'failed' | 'flaky' | 'skipped'
  detail?: string
  compatibilityState?: 'passed' | 'degraded' | 'failed'
}

export type CanarySummary = {
  state: 'passed' | 'degraded' | 'failed' | 'not-run'
  executed: number
  passed: number
  flaky: number
  skipped: number
  failed: number
}

export const summarizeCanaryOutcomes = (outcomes: readonly CanaryTestOutcome[], runStatus: FullResult['status']): CanarySummary => {
  const passed = outcomes.filter(outcome => outcome.status === 'passed').length
  const flaky = outcomes.filter(outcome => outcome.status === 'flaky').length
  const skipped = outcomes.filter(outcome => outcome.status === 'skipped').length
  const failed = outcomes.filter(outcome => outcome.status === 'failed').length
  const executed = outcomes.length - skipped
  const runFailed = runStatus !== 'passed'
  const observedCompatibilityDrift = outcomes.some(
    outcome => outcome.compatibilityState === 'degraded' || outcome.compatibilityState === 'failed',
  )
  const state =
    executed === 0
      ? 'not-run'
      : failed > 0 || runFailed
        ? 'failed'
        : skipped > 0 || flaky > 0 || observedCompatibilityDrift
          ? 'degraded'
          : 'passed'

  return { state, executed, passed, flaky, skipped, failed }
}

export const shouldFailCanaryRun = (summary: CanarySummary, requireClean = false) =>
  summary.executed === 0 || summary.state === 'failed' || (requireClean && summary.state !== 'passed')

const escapeCell = (value: string) => value.replaceAll('|', '\\|').replaceAll(/\r?\n/g, ' ')

export const renderCanarySummary = (outcomes: readonly CanaryTestOutcome[], runStatus: FullResult['status']): string => {
  const summary = summarizeCanaryOutcomes(outcomes, runStatus)
  const lines = [
    '## Real YouTube canary',
    '',
    '| Result | Value |',
    '| --- | ---: |',
    `| State | ${summary.state} |`,
    `| Executed | ${summary.executed} |`,
    `| Passed | ${summary.passed} |`,
    `| Flaky | ${summary.flaky} |`,
    `| Skipped | ${summary.skipped} |`,
    `| Failed | ${summary.failed} |`,
  ]

  if (outcomes.length > 0) {
    lines.push('', '| Test | Outcome | Detail |', '| --- | --- | --- |')
    for (const outcome of outcomes) {
      const detail = [outcome.detail, outcome.compatibilityState ? `compatibility: ${outcome.compatibilityState}` : undefined]
        .filter(Boolean)
        .join('; ')
      lines.push(`| ${escapeCell(outcome.title)} | ${outcome.status} | ${escapeCell(detail)} |`)
    }
  }

  return lines.join('\n')
}

class CanarySummaryReporter implements Reporter {
  private suite: Suite | null = null

  onBegin(_config: unknown, suite: Suite) {
    this.suite = suite
  }

  async onEnd(result: FullResult) {
    if (!this.suite) return

    const canaryTests = this.suite.allTests().filter(test => test.parent.project()?.name === CANARY_PROJECT_NAME)
    if (canaryTests.length === 0) return

    const outcomes: CanaryTestOutcome[] = canaryTests.map(test => {
      const outcome = test.outcome()
      const lastResult = test.results.at(-1)
      const skipReason = lastResult?.annotations.find(annotation => annotation.type === 'skip')?.description
      const failure = lastResult?.error?.message?.split('\n')[0]
      const compatibility = lastResult?.annotations.find(annotation => annotation.type === 'compatibility')?.description
      return {
        title: test.titlePath().slice(1).join(' › '),
        file: test.location.file,
        status: outcome === 'expected' ? 'passed' : outcome === 'unexpected' ? 'failed' : outcome,
        detail: outcome === 'skipped' ? skipReason : failure,
        compatibilityState:
          compatibility === 'passed' || compatibility === 'degraded' || compatibility === 'failed' ? compatibility : undefined,
      }
    })

    const summary = summarizeCanaryOutcomes(outcomes, result.status)
    const summaryPath = process.env.GITHUB_STEP_SUMMARY
    if (summaryPath) await appendFile(summaryPath, `\n${renderCanarySummary(outcomes, result.status)}\n`, 'utf8')
    if (shouldFailCanaryRun(summary, process.env.YLC_CANARY_REQUIRE_CLEAN === '1')) return { status: 'failed' as const }
  }

  printsToStdio() {
    return false
  }
}

export default CanarySummaryReporter
