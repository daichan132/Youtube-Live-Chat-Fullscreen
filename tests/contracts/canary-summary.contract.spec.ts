import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { CANARY_PROJECT_NAME } from '../../e2e/config/projectClassification'
import {
  type CanaryTestOutcome,
  renderCanarySummary,
  shouldFailCanaryRun,
  summarizeCanaryOutcomes,
} from '../../e2e/reporters/canarySummary'

const execute = promisify(execFile)
const require = createRequire(import.meta.url)
const projectRoot = resolve(import.meta.dirname, '../..')
const skipReason = 'Synthetic archive precondition is unavailable.'

const runReporterFixture = async (requireClean: boolean) => {
  const directory = await mkdtemp(join(tmpdir(), 'ylc-canary-reporter-'))
  const configPath = join(directory, 'playwright.config.ts')
  const jsonPath = join(directory, 'canary-summary.json')
  const markdownPath = join(directory, 'step-summary.md')

  try {
    await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
    await writeFile(
      configPath,
      `import sourceConfig from ${JSON.stringify(join(projectRoot, 'playwright.config.ts'))}
import { resolve } from 'node:path'

const reporters = typeof sourceConfig.reporter === 'string' ? [[sourceConfig.reporter]] : sourceConfig.reporter
export default {
  ...sourceConfig,
  globalSetup: undefined,
  reporter: reporters?.map(([name, ...options]) => [
    name.startsWith('.') ? resolve(${JSON.stringify(projectRoot)}, name) : name,
    ...options,
  ]),
  outputDir: ${JSON.stringify(join(directory, 'test-results'))},
  projects: [{ name: ${JSON.stringify(CANARY_PROJECT_NAME)}, testDir: ${JSON.stringify(directory)}, testMatch: 'reporter.fixture.spec.ts' }],
}
`,
    )
    await writeFile(
      join(directory, 'reporter.fixture.spec.ts'),
      `import playwright from ${JSON.stringify(require.resolve('@playwright/test'))}
const { test } = playwright

test('local canary passes', () => {})
test('local archive is skipped', () => { test.skip(true, ${JSON.stringify(skipReason)}) })
`,
    )

    const result = await execute(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '--config', configPath], {
      cwd: directory,
      timeout: 15_000,
      env: {
        ...process.env,
        YLC_CANARY_REQUIRE_CLEAN: requireClean ? '1' : '0',
        YLC_CANARY_SUMMARY_PATH: jsonPath,
        GITHUB_STEP_SUMMARY: markdownPath,
        PLAYWRIGHT_HTML_OPEN: 'never',
        PLAYWRIGHT_HTML_OUTPUT_DIR: join(directory, 'html-report'),
      },
    }).then(
      ({ stdout, stderr }) => ({ exitCode: 0, stdout, stderr }),
      error => {
        if (typeof error.code !== 'number' || error.killed) throw error
        return { exitCode: error.code as number, stdout: String(error.stdout), stderr: String(error.stderr) }
      },
    )
    const output = `${result.stdout}\n${result.stderr}`
    const readArtifact = async (file: string) => {
      try {
        return await readFile(file, 'utf8')
      } catch (error) {
        throw new Error(`Canary reporter did not write ${file}\n${output}`, { cause: error })
      }
    }
    return {
      ...result,
      json: JSON.parse(await readArtifact(jsonPath)),
      markdown: await readArtifact(markdownPath),
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

const passed: CanaryTestOutcome = {
  title: 'live › auto open',
  file: 'e2e/scenarios/live/fullscreenChatAutoOpen.spec.ts',
  status: 'passed',
}

describe('Real YouTube canary summary', () => {
  it.each([
    { lane: 'ordinary', requireClean: false },
    { lane: 'strict release', requireClean: true },
  ])(
    'publishes actual runner outcomes in the $lane lane without a browser',
    async ({ requireClean }) => {
      const result = await runReporterFixture(requireClean)
      const output = `${result.stdout}\n${result.stderr}`

      if (requireClean) expect(result.exitCode, output).not.toBe(0)
      else expect(result.exitCode, output).toBe(0)
      expect(result.json).toMatchObject({
        summary: { state: 'degraded', executed: 1, passed: 1, flaky: 0, skipped: 1, failed: 0 },
        runStatus: 'passed',
      })
      expect(result.json.outcomes).toHaveLength(2)
      expect(result.json.outcomes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'passed', title: expect.stringContaining('local canary passes') }),
          expect.objectContaining({ status: 'skipped', title: expect.stringContaining('local archive is skipped'), detail: skipReason }),
        ]),
      )
      expect(result.markdown).toMatch(/\|\s*State\s*\|\s*degraded\s*\|/)
      expect(result.markdown).toMatch(/\|\s*Executed\s*\|\s*1\s*\|/)
      expect(result.markdown).toMatch(/\|\s*Skipped\s*\|\s*1\s*\|/)
      expect(result.markdown).toContain(skipReason)
    },
    20_000,
  )

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

  it('keeps uncorroborated fingerprint failures degraded outside the strict release lane', () => {
    expect(summarizeCanaryOutcomes([{ ...passed, compatibilityState: 'degraded' }], 'passed').state).toBe('degraded')
    const degraded = summarizeCanaryOutcomes([{ ...passed, compatibilityState: 'failed' }], 'passed')

    expect(degraded.state).toBe('degraded')
    expect(shouldFailCanaryRun(degraded)).toBe(false)
    expect(shouldFailCanaryRun(degraded, true)).toBe(true)
    expect(renderCanarySummary([{ ...passed, compatibilityState: 'degraded' }], 'passed')).toContain('compatibility: degraded')
  })

  it('still fails interrupted or timed-out runs', () => {
    expect(summarizeCanaryOutcomes([passed], 'interrupted').state).toBe('failed')
    expect(summarizeCanaryOutcomes([passed], 'timedout').state).toBe('failed')
  })

  it('reports the observed three-flaky two-skipped scheduled run as degraded', () => {
    const outcomes: CanaryTestOutcome[] = [
      { ...passed, title: 'archive › transition', status: 'flaky', compatibilityState: 'failed' },
      { ...passed, title: 'archive › replay', status: 'flaky', compatibilityState: 'failed' },
      { ...passed, title: 'live › no chat', status: 'flaky', compatibilityState: 'failed' },
      { ...passed, title: 'live › auto open', status: 'skipped' },
      { ...passed, title: 'live › native fallback', status: 'skipped' },
    ]

    const summary = summarizeCanaryOutcomes(outcomes, 'passed')

    expect(summary).toMatchObject({ state: 'degraded', executed: 3, flaky: 3, skipped: 2, failed: 0 })
    expect(shouldFailCanaryRun(summary)).toBe(false)
    expect(shouldFailCanaryRun(summary, true)).toBe(true)
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

  it('rejects degraded evidence in the strict release-candidate lane', () => {
    const degraded = summarizeCanaryOutcomes([passed, { ...passed, title: 'archive › replay', status: 'skipped' }], 'passed')

    expect(shouldFailCanaryRun(degraded)).toBe(false)
    expect(shouldFailCanaryRun(degraded, true)).toBe(true)
  })

  it('keeps diagnostics after a non-green run on a fixed runner image', () => {
    const workflow = readFileSync(resolve(import.meta.dirname, '../../.github/workflows/canary.yml'), 'utf8')

    expect(workflow).toContain('runs-on: ubuntu-24.04')
    expect(workflow).toContain('if: always()')
    expect(workflow).toContain('playwright-report')
    expect(workflow).toContain('test-results')
  })
})
