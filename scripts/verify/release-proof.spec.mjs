import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execute = promisify(execFile)
const directories = []
const commit = '1'.repeat(40)
const artifacts = [
  { suffix: 'chrome', content: 'abc', bytes: 3, sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
  { suffix: 'firefox', content: 'hello', bytes: 5, sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' },
  { suffix: 'sources', content: 'test', bytes: 4, sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' },
]

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

// The CLI resolves package.json and opaque release bytes relative to its own
// location. Copy the actual script into a disposable project; do not redirect
// the real checkout's .output or duplicate its hashing/inventory decisions.
const createProject = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ylc-release-proof-'))
  directories.push(root)
  await mkdir(path.join(root, 'scripts', 'verify'), { recursive: true })
  await mkdir(path.join(root, '.output'))
  const script = path.join(root, 'scripts', 'verify', 'release-proof.mjs')
  await copyFile(new URL('./release-proof.mjs', import.meta.url), script)
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ type: 'module', version: '1.2.3' }))
  const expected = artifacts.map(({ suffix, bytes, sha256 }) => ({
    name: `youtube-live-chat-fullscreen-1.2.3-${suffix}.zip`, bytes, sha256,
  }))
  for (const [index, artifact] of artifacts.entries()) {
    await writeFile(path.join(root, '.output', expected[index].name), artifact.content)
  }
  const run = async (...args) => execute(process.execPath, [script, ...args], { cwd: root, timeout: 5000 })
  const proofPath = path.join(root, '.output', 'release-proof-v1.2.3.json')
  await run('create', '--commit', commit)
  return { root, expected, run, proofPath, proof: JSON.parse(await readFile(proofPath, 'utf8')) }
}

describe('release proof CLI', () => {
  it('records the exact package, commit, inventory, sizes, and known digests, then verifies those bytes', async () => {
    const project = await createProject()
    const byName = (left, right) => left.name.localeCompare(right.name)
    expect({ ...project.proof, artifacts: [...project.proof.artifacts].sort(byName) }).toEqual({
      schemaVersion: 3,
      version: '1.2.3',
      commit,
      createdAt: expect.any(String),
      artifacts: [...project.expected].sort(byName),
    })
    expect(Number.isNaN(Date.parse(project.proof.createdAt))).toBe(false)
    await expect(project.run('verify', '--expected-commit', commit)).resolves.toMatchObject({
      stdout: expect.stringContaining(`Verified release proof for v1.2.3 at ${commit}`),
    })
  })

  it.each(['chrome', 'firefox', 'sources'])('rejects changed %s bytes even when the artifact size is unchanged', async suffix => {
    const project = await createProject()
    const artifact = project.expected.find(item => item.name.endsWith(`-${suffix}.zip`))
    const file = path.join(project.root, '.output', artifact.name)
    const original = await readFile(file)
    const changed = Buffer.from(original)
    changed[0] ^= 1
    await writeFile(file, changed)
    await expect(project.run('verify', '--expected-commit', commit)).rejects.toMatchObject({
      stderr: expect.stringContaining(`Release artifact does not match its proof: ${artifact.name}`),
    })
  })

  it('rejects a different candidate commit while the artifact bytes still match', async () => {
    const project = await createProject()
    await expect(project.run('verify', '--expected-commit', '2'.repeat(40))).rejects.toMatchObject({
      stderr: expect.stringContaining('does not match checked-out commit'),
    })
  })

  it.each([
    { fault: 'schema', change: proof => { proof.schemaVersion = 2 }, message: 'schema or version does not match' },
    { fault: 'version', change: proof => { proof.version = '1.2.4' }, message: 'schema or version does not match' },
    { fault: 'commit', change: proof => { proof.commit = '1234567' }, message: 'requires a full Git commit SHA' },
    { fault: 'missing inventory', change: proof => { proof.artifacts.pop() }, message: 'artifact inventory is incomplete' },
    { fault: 'duplicate artifact', change: proof => { proof.artifacts[2] = proof.artifacts[1] }, message: 'is missing' },
    { fault: 'size', change: proof => { proof.artifacts[0].bytes += 1 }, message: 'does not match its proof' },
  ])('rejects a proof with an invalid $fault', async ({ change, message }) => {
    const project = await createProject()
    change(project.proof)
    await writeFile(project.proofPath, JSON.stringify(project.proof))
    await expect(project.run('verify', '--expected-commit', commit)).rejects.toMatchObject({
      stderr: expect.stringContaining(message),
    })
  })
})
