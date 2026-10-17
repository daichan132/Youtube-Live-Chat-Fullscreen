import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { assertReleaseWorkflows } from './check-release-workflow.mjs'
import { createGitHubApi, resolveReleaseCandidate } from './release-candidate.mjs'

const commit = 'a'.repeat(40)
const trustedCommit = 'b'.repeat(40)
const repository = 'owner/extension'
const runId = 123
const version = '2.3.16'
const artifactName = 'release-candidate-123-2'
const workflow = { id: 9, path: '.github/workflows/cd.yml' }
const run = {
  id: runId,
  workflow_id: workflow.id,
  path: workflow.path,
  repository: { id: 4, full_name: repository },
  head_repository: { id: 4 },
  head_branch: 'main',
  head_sha: commit,
  event: 'workflow_dispatch',
  status: 'completed',
  conclusion: 'success',
  run_attempt: 2,
}
const artifact = {
  id: 456,
  name: artifactName,
  expired: false,
  digest: `sha256:${'c'.repeat(64)}`,
  workflow_run: { id: runId, repository_id: 4, head_repository_id: 4, head_branch: 'main', head_sha: commit },
}

const fixture = ({ candidate = run, candidateWorkflow = workflow, artifacts = [artifact], gitImpl } = {}) => {
  const git = vi.fn(
    gitImpl ??
      (args => {
        if (args[0] === 'rev-parse') return commit
        if (args[0] === 'merge-base') return ''
        if (args[0] === 'show') return JSON.stringify({ version })
        throw new Error('Unexpected Git operation')
      }),
  )
  const request = vi.fn(async endpoint => {
    if (endpoint === `repos/${repository}/actions/workflows/cd.yml`) return candidateWorkflow
    if (endpoint === `repos/${repository}/actions/runs/${runId}`) return candidate
    if (endpoint === `repos/${repository}/actions/runs/${runId}/artifacts?name=${artifactName}&per_page=100`)
      return { total_count: artifacts.length, artifacts }
    throw new Error(`Unexpected API operation: ${endpoint}`)
  })
  return {
    git,
    request,
    resolve: () => resolveReleaseCandidate({ repository, version, runId: String(runId), trustedCommit, request, git }),
  }
}

describe('release candidate provenance', () => {
  it('selects an exact artifact ID only after checking trusted history and successful source metadata', async () => {
    const setup = fixture()
    await expect(setup.resolve()).resolves.toEqual({ commit, version, runId, attempt: 2, artifactId: 456, artifactName })
    expect(setup.git.mock.calls).toEqual([
      [['rev-parse', '--verify', `refs/tags/v${version}^{commit}`]],
      [['merge-base', '--is-ancestor', commit, trustedCommit]],
      [['show', `${commit}:package.json`]],
    ])
  })

  it('rejects a tag that introduces source outside trusted main before requesting artifacts', async () => {
    const setup = fixture({
      gitImpl: args => {
        if (args[0] === 'rev-parse') return commit
        throw new Error('not an ancestor')
      },
    })
    await expect(setup.resolve()).rejects.toThrow('not an ancestor')
    expect(setup.request).not.toHaveBeenCalled()
  })

  it('rejects a tag moved away from the source tested by the candidate run', async () => {
    await expect(fixture({ candidate: { ...run, head_sha: 'd'.repeat(40) } }).resolve()).rejects.toThrow('does not match the release tag')
  })

  it.each([
    ['foreign run', { id: 999 }],
    ['foreign workflow', { workflow_id: 99 }],
    ['different workflow path', { path: '.github/workflows/ci.yml' }],
    ['foreign repository', { repository: { id: 5, full_name: 'attacker/extension' } }],
    ['fork', { head_repository: { id: 5 } }],
    ['different branch', { head_branch: 'unreviewed' }],
    ['pull request event', { event: 'pull_request' }],
    ['incomplete run', { status: 'in_progress' }],
    ['failed run', { conclusion: 'failure' }],
    ['invalid attempt', { run_attempt: 0 }],
  ])('rejects %s metadata', async (_label, patch) => {
    await expect(fixture({ candidate: { ...run, ...patch } }).resolve()).rejects.toThrow()
  })

  it.each([
    ['older attempt', { name: 'release-candidate-123-1' }],
    ['expired artifact', { expired: true }],
    ['missing digest', { digest: null }],
    ['malformed digest', { digest: 'sha256:tampered' }],
    ['foreign artifact source', { workflow_run: { ...artifact.workflow_run, id: 999 } }],
    ['forked artifact', { workflow_run: { ...artifact.workflow_run, head_repository_id: 5 } }],
    ['different artifact commit', { workflow_run: { ...artifact.workflow_run, head_sha: 'd'.repeat(40) } }],
  ])('rejects %s', async (_label, patch) => {
    await expect(fixture({ artifacts: [{ ...artifact, ...patch }] }).resolve()).rejects.toThrow()
  })

  it.each([{ artifacts: [] }, { artifacts: [artifact, artifact] }])(
    'rejects missing or ambiguous artifact inventory',
    async ({ artifacts }) => {
      await expect(fixture({ artifacts }).resolve()).rejects.toThrow('exactly one artifact')
    },
  )

  it('rejects a replaced workflow identity', async () => {
    await expect(fixture({ candidateWorkflow: { ...workflow, path: '.github/workflows/ci.yml' } }).resolve()).rejects.toThrow(
      'release-candidate workflow',
    )
  })

  it('fails closed on API authorization errors without logging response bodies or tokens', async () => {
    const request = createGitHubApi({ token: 'private-token', fetchImpl: async () => ({ ok: false, status: 403 }) })
    await expect(request('repos/owner/extension/actions/runs/123')).rejects.toThrow('HTTP 403')
  })

  it('rejects a non-main CLI dispatch before invoking GitHub or writing outputs', () => {
    expect(() =>
      execFileSync(process.execPath, [fileURLToPath(new URL('./release-candidate.mjs', import.meta.url))], {
        env: { ...process.env, GITHUB_REF: 'refs/heads/untrusted', GH_TOKEN: '', GITHUB_OUTPUT: '' },
        stdio: 'pipe',
      }),
    ).toThrow(/Publication must run from main/)
  })

  it('validates a real scratch Git history through the CLI and rejects a subsequently moved tag', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ylc-candidate-cli-'))
    try {
      await mkdir(join(directory, 'scripts/verify'), { recursive: true })
      await copyFile(new URL('./release-candidate.mjs', import.meta.url), join(directory, 'scripts/verify/release-candidate.mjs'))
      await writeFile(join(directory, 'package.json'), JSON.stringify({ version }))
      const git = args =>
        execFileSync(
          'git',
          [
            '-c',
            'core.hooksPath=/dev/null',
            '-c',
            'commit.gpgsign=false',
            '-c',
            'user.name=Release test',
            '-c',
            'user.email=test@example.invalid',
            ...args,
          ],
          { cwd: directory, encoding: 'utf8', stdio: 'pipe' },
        ).trim()
      git(['init', '-b', 'main'])
      git(['add', '.'])
      git(['commit', '-m', 'Candidate'])
      const sourceCommit = git(['rev-parse', 'HEAD'])
      git(['tag', `v${version}`])
      await writeFile(join(directory, 'main-marker'), 'New trusted main revision')
      git(['add', '.'])
      git(['commit', '-m', 'Later main'])
      const mainCommit = git(['rev-parse', 'HEAD'])
      const responses = {
        [`https://api.github.com/repos/${repository}/actions/workflows/cd.yml`]: workflow,
        [`https://api.github.com/repos/${repository}/actions/runs/${runId}`]: { ...run, head_sha: sourceCommit },
        [`https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts?name=${artifactName}&per_page=100`]: {
          total_count: 1,
          artifacts: [{ ...artifact, workflow_run: { ...artifact.workflow_run, head_sha: sourceCommit } }],
        },
      }
      const preload = join(directory, 'mock-github.mjs')
      await writeFile(
        preload,
        `const responses = ${JSON.stringify(responses)}; globalThis.fetch = async url => { if (!(url in responses)) throw new Error('Unexpected network request'); return {ok: true, json: async () => responses[url]}; };`,
      )
      const output = join(directory, 'github-output')
      const invoke = () =>
        execFileSync(process.execPath, ['--import', preload, join(directory, 'scripts/verify/release-candidate.mjs')], {
          cwd: directory,
          env: {
            ...process.env,
            GITHUB_REF: 'refs/heads/main',
            GITHUB_SHA: mainCommit,
            GITHUB_REPOSITORY: repository,
            GH_TOKEN: 'fixture-token',
            RELEASE_VERSION: version,
            CANDIDATE_RUN_ID: String(runId),
            GITHUB_OUTPUT: output,
          },
          stdio: 'pipe',
        })
      invoke()
      expect(await readFile(output, 'utf8')).toBe(`commit=${sourceCommit}\nrun_id=123\nartifact_id=456\n`)
      await rm(output)
      git(['tag', '-f', `v${version}`, mainCommit])
      expect(invoke).toThrow(/Candidate source commit does not match the release tag/)
      await expect(readFile(output)).rejects.toMatchObject({ code: 'ENOENT' })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})

describe('release workflow trust boundaries', () => {
  const load = async () => ({
    candidate: await readFile(new URL('../../.github/workflows/cd.yml', import.meta.url), 'utf8'),
    publish: await readFile(new URL('../../.github/workflows/publish.yml', import.meta.url), 'utf8'),
  })

  it('accepts the current manual, immutable artifact promotion path', async () => {
    const { candidate, publish } = await load()
    expect(() => assertReleaseWorkflows(candidate, publish)).not.toThrow()
  })

  it.each([
    [
      'mutable release downloads',
      text =>
        text.replace(
          '      - name: Validate requested version',
          '      - run: gh release download\n      - name: Validate requested version',
        ),
    ],
    ['mutable validation checkout', text => text.replace('ref: ${{ github.sha }}', 'ref: v${{ inputs.version }}')],
    ['disabled digest enforcement', text => text.replace('digest-mismatch: error', 'digest-mismatch: warn')],
    ['mutable store checkout', text => text.replace('ref: ${{ needs.validate-candidate.outputs.commit }}', 'ref: v${{ inputs.version }}')],
    ['missing candidate validation', text => text.replace('run: node scripts/verify/release-candidate.mjs', 'run: echo bypassed')],
  ])('rejects %s', async (_label, mutate) => {
    const { candidate, publish } = await load()
    expect(() => assertReleaseWorkflows(candidate, mutate(publish))).toThrow()
  })
})
