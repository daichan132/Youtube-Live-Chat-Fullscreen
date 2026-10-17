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
  it('accepts the current jobs and a renamed trusted-ref guard', () => {
    expect(() => assertReleaseWorkflows(candidate, publish)).not.toThrow()
    expect(() =>
      assertReleaseWorkflows(candidate, publish.replace('Require trusted publication workflow', 'Reject non-main publication')),
    ).not.toThrow()
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
