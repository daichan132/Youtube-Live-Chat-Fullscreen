#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const args = process.argv.slice(2)
const command = args.shift()
const readOption = name => {
  const index = args.indexOf(name)
  if (index < 0 || !args[index + 1]) return null
  return args[index + 1]
}
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const version = packageJson.version
const proofPath = path.resolve(root, readOption('--proof') ?? `.output/release-proof-v${version}.json`)
const artifactNames = [
  `youtube-live-chat-fullscreen-${version}-chrome.zip`,
  `youtube-live-chat-fullscreen-${version}-firefox.zip`,
  `youtube-live-chat-fullscreen-${version}-sources.zip`,
]

const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex')
const describeArtifact = async name => {
  const file = path.join(root, '.output', name)
  return { name, bytes: (await stat(file)).size, sha256: await sha256(file) }
}
const requireCommit = commit => {
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`Release proof requires a full Git commit SHA, got: ${commit}`)
  return commit
}

if (command === 'create') {
  const commit = requireCommit(
    readOption('--commit') ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  )
  const proof = {
    schemaVersion: 1,
    version,
    commit,
    createdAt: new Date().toISOString(),
    browserEvidence: {
      engine: 'chromium',
      runner: 'ubuntu-24.04',
      playwright: packageJson.devDependencies['@playwright/test'],
      package: 'production-chrome-zip',
    },
    artifacts: await Promise.all(artifactNames.map(describeArtifact)),
    gates: [
      { id: 'source-and-contracts', status: 'passed' },
      { id: 'coverage', status: 'passed' },
      { id: 'production-package-contracts', status: 'passed' },
      { id: 'deterministic-browser-contracts', status: 'passed' },
      { id: 'production-chrome-zip-smoke', status: 'passed' },
      { id: 'real-youtube-canary-clean', status: 'passed' },
    ],
    invariants: [
      'REG-221-video-isolation',
      'REG-234-blur-visible',
      'focus-idle-visibility',
      'production-package-no-test-assets',
      'exact-artifact-promotion',
    ],
  }
  await writeFile(proofPath, `${JSON.stringify(proof, null, 2)}\n`, 'utf8')
  console.log(`Created release proof: ${path.relative(root, proofPath)}`)
} else if (command === 'verify') {
  const proof = JSON.parse(await readFile(proofPath, 'utf8'))
  if (proof.schemaVersion !== 1 || proof.version !== version) throw new Error('Release proof schema or version does not match package.json.')
  requireCommit(proof.commit)
  if (
    proof.browserEvidence?.engine !== 'chromium' ||
    proof.browserEvidence?.runner !== 'ubuntu-24.04' ||
    proof.browserEvidence?.playwright !== packageJson.devDependencies['@playwright/test'] ||
    proof.browserEvidence?.package !== 'production-chrome-zip'
  ) {
    throw new Error('Release proof browser identity is missing or does not match this revision.')
  }
  const expectedCommit = readOption('--expected-commit')
  if (expectedCommit && proof.commit !== requireCommit(expectedCommit)) {
    throw new Error(`Release proof commit ${proof.commit} does not match checked-out commit ${expectedCommit}.`)
  }
  if (!Array.isArray(proof.artifacts) || proof.artifacts.length !== artifactNames.length) {
    throw new Error('Release proof artifact inventory is incomplete.')
  }
  for (const expectedName of artifactNames) {
    const artifact = proof.artifacts.find(candidate => candidate.name === expectedName)
    if (!artifact) throw new Error(`Release proof is missing ${expectedName}.`)
    const actual = await describeArtifact(expectedName)
    if (artifact.bytes !== actual.bytes || artifact.sha256 !== actual.sha256) {
      throw new Error(`Release artifact does not match its proof: ${expectedName}`)
    }
  }
  const requiredGates = [
    'source-and-contracts',
    'coverage',
    'production-package-contracts',
    'deterministic-browser-contracts',
    'production-chrome-zip-smoke',
    'real-youtube-canary-clean',
  ]
  for (const id of requiredGates) {
    if (!proof.gates?.some(gate => gate.id === id && gate.status === 'passed')) throw new Error(`Release gate is not proven: ${id}`)
  }
  console.log(`Verified release proof for v${version} at ${proof.commit}`)
} else {
  throw new Error('Usage: release-proof.mjs <create|verify> [--proof path] [--commit sha] [--expected-commit sha]')
}
