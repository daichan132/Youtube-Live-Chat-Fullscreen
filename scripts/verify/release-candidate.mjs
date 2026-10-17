#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { appendFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const candidateWorkflowPath = '.github/workflows/cd.yml'
const root = fileURLToPath(new URL('../..', import.meta.url))

export const requireReleaseVersion = version => {
  if (
    typeof version !== 'string' ||
    !/^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z]+([.-][0-9A-Za-z]+)*)?(\+[0-9A-Za-z]+([.-][0-9A-Za-z]+)*)?$/.test(version)
  ) {
    throw new Error('A semver release version without a leading v is required.')
  }
  return version
}

const requireCommit = commit => {
  if (typeof commit !== 'string' || !/^[0-9a-f]{40}$/.test(commit)) throw new Error('A full Git commit SHA is required.')
  return commit
}

const requireId = (value, label) => {
  if (!/^[1-9][0-9]*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new Error(`${label} must be a positive integer.`)
  return Number(value)
}

const runGit = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

export const createGitHubApi =
  ({ token, fetchImpl = fetch }) =>
  async endpoint => {
    const response = await fetchImpl(`https://api.github.com/${endpoint}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2026-03-10',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error(`GitHub candidate metadata request failed with HTTP ${response.status}.`)
    return response.json()
  }

// Run and artifact metadata come from GitHub, never from the mutable draft Release.
export const resolveReleaseCandidate = async ({ repository, version, runId, trustedCommit, request, git = runGit }) => {
  requireReleaseVersion(version)
  requireCommit(trustedCommit)
  const candidateRunId = requireId(runId, 'Candidate run ID')
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('A GitHub owner/repository is required.')
  const commit = requireCommit(git(['rev-parse', '--verify', `refs/tags/v${version}^{commit}`]))
  // A writable tag must not introduce source code outside the trusted main history.
  git(['merge-base', '--is-ancestor', commit, trustedCommit])
  const packageJson = JSON.parse(git(['show', `${commit}:package.json`]))
  if (packageJson.version !== version) throw new Error('Release tag package version does not match the requested version.')

  const prefix = `repos/${repository}/actions`
  const [workflow, run] = await Promise.all([request(`${prefix}/workflows/cd.yml`), request(`${prefix}/runs/${candidateRunId}`)])
  requireId(workflow.id, 'Candidate workflow ID')
  if (workflow.path !== candidateWorkflowPath || run.workflow_id !== workflow.id || run.path?.split('@')[0] !== candidateWorkflowPath) {
    throw new Error('Candidate run does not belong to the release-candidate workflow.')
  }
  const repositoryId = requireId(run.repository?.id, 'Candidate repository ID')
  if (run.id !== candidateRunId || run.repository?.full_name !== repository || run.head_repository?.id !== repositoryId) {
    throw new Error('Candidate run must belong to this repository and cannot come from a fork.')
  }
  if (run.event !== 'workflow_dispatch' || run.head_branch !== 'main' || run.status !== 'completed' || run.conclusion !== 'success') {
    throw new Error('Candidate must be a completed, successful manual run on main.')
  }
  if (run.head_sha !== commit) throw new Error('Candidate source commit does not match the release tag.')
  const attempt = requireId(run.run_attempt, 'Candidate run attempt')
  const artifactName = `release-candidate-${candidateRunId}-${attempt}`
  const inventory = await request(`${prefix}/runs/${candidateRunId}/artifacts?name=${artifactName}&per_page=100`)
  if (inventory.total_count !== 1 || !Array.isArray(inventory.artifacts) || inventory.artifacts.length !== 1) {
    throw new Error('Expected exactly one artifact from the successful candidate attempt.')
  }
  const [artifact] = inventory.artifacts
  const artifactId = requireId(artifact.id, 'Candidate artifact ID')
  if (artifact.name !== artifactName || artifact.expired !== false || !/^sha256:[0-9a-f]{64}$/.test(artifact.digest)) {
    throw new Error('Candidate artifact name, expiration, or digest is invalid.')
  }
  const source = artifact.workflow_run
  if (
    source?.id !== candidateRunId ||
    source.repository_id !== repositoryId ||
    source.head_repository_id !== repositoryId ||
    source.head_sha !== commit ||
    source.head_branch !== 'main'
  ) {
    throw new Error('Candidate artifact source does not match the validated run.')
  }
  return { commit, version, runId: candidateRunId, attempt, artifactId, artifactName }
}

const main = async () => {
  if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Publication must run from main.')
  if (!process.env.GH_TOKEN || !process.env.GITHUB_OUTPUT) throw new Error('GitHub token and output file are required.')
  const candidate = await resolveReleaseCandidate({
    repository: process.env.GITHUB_REPOSITORY,
    version: process.env.RELEASE_VERSION,
    runId: process.env.CANDIDATE_RUN_ID,
    trustedCommit: process.env.GITHUB_SHA,
    request: createGitHubApi({ token: process.env.GH_TOKEN }),
  })
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `commit=${candidate.commit}\nrun_id=${candidate.runId}\nartifact_id=${candidate.artifactId}\n`,
  )
  console.log(
    `Validated candidate run ${candidate.runId}, attempt ${candidate.attempt}, artifact ${candidate.artifactId}, commit ${candidate.commit}`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
