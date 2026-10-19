import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { assertReleaseWorkflows } from './check-release-workflow.mjs'

const candidate = await readFile(new URL('../../.github/workflows/cd.yml', import.meta.url), 'utf8')
const publish = await readFile(new URL('../../.github/workflows/publish.yml', import.meta.url), 'utf8')
// biome-ignore lint/suspicious/noTemplateCurlyInString: Match the literal GitHub Actions expression.
const storeCommit = '          ref: ${{ needs.validate-candidate.outputs.commit }}\n'
// biome-ignore lint/suspicious/noTemplateCurlyInString: Match the literal GitHub Actions expression.
const storeArtifact = '          artifact-ids: ${{ needs.validate-candidate.outputs.artifact_id }}'

const replaceJob = (workflow, name, replace) => {
  const start = workflow.indexOf(`\n  ${name}:\n`) + 1
  if (start === 0) throw new Error(`Missing fixture job ${name}`)
  const nextJob = /^ {2}[\w-]+:\n/m.exec(workflow.slice(start + 1))
  const end = nextJob ? start + 1 + nextJob.index : workflow.length
  return workflow.slice(0, start) + replace(workflow.slice(start, end)) + workflow.slice(end)
}

const moveCheckout = (workflow, from, to) => {
  let checkout
  const removed = replaceJob(workflow, from, job =>
    job.replace(/^ {6}- uses: actions\/checkout@[^\n]*\n[\s\S]*?(?=^ {6}- )/m, step => {
      checkout = step
      return ''
    }),
  )
  if (!checkout?.includes(storeCommit)) throw new Error('Missing fixture checkout step')
  return replaceJob(removed, to, job => job.replace('    steps:\n', `    steps:\n${checkout}`))
}

describe('release publication job contracts', () => {
  it('keeps the complete deterministic gate separate from strict production canary', async () => {
    const { scripts } = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(scripts['verify:release:ci'].split(' && ')).toEqual([
      'yarn verify',
      'yarn test:package',
      'yarn verify:firefox-source',
      'yarn build:e2e',
      'playwright test --project=fixture --project=visual --project=accessibility --retries=0 --max-failures=1',
      'yarn e2e:production:chrome',
    ])
    expect(scripts['verify:release']).toBe('yarn verify:release:ci && yarn e2e:canary:production')
    expect(scripts['e2e:canary:production']).toBe(
      'YLC_EXTENSION_OUTPUT_DIR=.output/production-smoke/chrome YLC_REQUIRE_E2E_BRIDGE=0 YLC_CANARY_REQUIRE_CLEAN=1 playwright test --project=canary --retries=0 --max-failures=1',
    )
    const standalone = await readFile(new URL('../../.github/workflows/canary.yml', import.meta.url), 'utf8')
    expect(standalone).toContain('run: yarn zip && yarn prepare:production-smoke')
    expect(standalone).toContain('run: xvfb-run --auto-servernum yarn e2e:canary:production')
    expect(candidate).not.toContain('yarn e2e:canary')
  })

  it('accepts the current jobs and changes to the trusted-ref guard display text', () => {
    expect(() => assertReleaseWorkflows(candidate, publish)).not.toThrow()
    expect(() =>
      assertReleaseWorkflows(
        candidate,
        publish
          .replace('Require trusted publication workflow', 'Reject non-main publication')
          .replace('Publication must run from main', 'Choose main before publishing'),
      ),
    ).not.toThrow()
  })

  it.each([
    ['removed', step => step.replace('run: node scripts/verify/release-browser-review.mjs', 'run: echo unchecked')],
    ['optional', step => step.replace('        env:', '        continue-on-error: true\n        env:')],
    ['conditional', step => step.replace('        env:', '        if: false\n        env:')],
    ['wrong artifact', step => step.replace('steps.candidate.outputs.artifact_id', 'inputs.reviewed_artifact_id')],
    ['implicit confirmation', step => step.replace('inputs.browser_review_confirmed', 'true')],
  ])('rejects browser review that is %s', (_name, change) => {
    const changed = publish.replace(/ {6}- name: Require candidate-specific browser review\n[\s\S]*?(?= {6}- name: Forward)/, change)
    expect(changed).not.toBe(publish)
    expect(() => assertReleaseWorkflows(candidate, changed)).toThrow()
  })

  it('rejects a read-only validation token that cannot see the draft release', () => {
    const changed = replaceJob(publish, 'validate-candidate', job => job.replace('contents: write', 'contents: read'))

    expect(changed).not.toBe(publish)
    expect(() => assertReleaseWorkflows(candidate, changed)).toThrow('Draft Release lookup needs push access')
  })

  it.each([
    ['removed', job => job.replace('            exit 1\n', '')],
    ['changed to success', job => job.replace('            exit 1\n', '            exit 0\n')],
    ['commented out', job => job.replace('            exit 1\n', '            # exit 1\n')],
    ['only printed', job => job.replace('            exit 1\n', '            echo "exit 1"\n')],
    [
      'moved outside the branch',
      job => job.replace('            exit 1\n', '').replace('          fi\n', '          fi\n          exit 1\n'),
    ],
    [
      'moved into the main branch',
      job => job.replace('            exit 1\n', '').replace('          fi\n', '          else\n            exit 1\n          fi\n'),
    ],
  ])('rejects a trusted-ref guard whose failing exit is %s', (_name, change) => {
    const changed = replaceJob(publish, 'validate-candidate', change)

    expect(changed).not.toBe(publish)
    expect(() => assertReleaseWorkflows(candidate, changed)).toThrow()
  })

  it.each(['publish-chrome', 'publish-firefox'])('rejects a different artifact in %s alone', name => {
    const changed = replaceJob(publish, name, job => job.replace(storeArtifact, '          artifact-ids: 123'))

    expect(() => assertReleaseWorkflows(candidate, changed)).toThrow()
  })

  it.each([
    ['publish-chrome', 'publish-firefox'],
    ['publish-firefox', 'publish-chrome'],
  ])('rejects moving the %s checkout into %s even when two immutable refs remain', (from, to) => {
    const changed = moveCheckout(publish, from, to)

    expect(changed.split(storeCommit)).toHaveLength(3)
    expect(() => assertReleaseWorkflows(candidate, changed)).toThrow()
  })

  it.each([
    ['publish-chrome', 'chrome-web-store'],
    ['publish-firefox', 'firefox-add-ons'],
  ])('rejects moving the %s protected environment to another job', (name, environment) => {
    const withoutEnvironment = replaceJob(publish, name, job => job.replace(`    environment: ${environment}\n`, ''))
    const changed = replaceJob(withoutEnvironment, 'validate-candidate', job =>
      job.replace('    runs-on: ubuntu-24.04\n', `    runs-on: ubuntu-24.04\n    environment: ${environment}\n`),
    )

    expect(() => assertReleaseWorkflows(candidate, changed)).toThrow()
  })

  it('rejects a renamed trusted-ref guard moved after checkout', () => {
    const changed = replaceJob(publish, 'validate-candidate', job => {
      const guard = job.match(/^ {6}- name: Require trusted publication workflow\n[\s\S]*?(?=^ {6}- )/m)?.[0]
      if (!guard) throw new Error('Missing fixture trusted-ref guard')
      return job
        .replace(guard, '')
        .replace(
          '      - uses: actions/setup-node@',
          `${guard.replace('Require trusted publication workflow', 'Reject non-main publication')}      - uses: actions/setup-node@`,
        )
    })

    expect(() => assertReleaseWorkflows(candidate, changed)).toThrow()
  })
})
