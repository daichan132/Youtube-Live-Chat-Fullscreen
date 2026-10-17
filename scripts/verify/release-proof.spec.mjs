import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const directories = []
const commit = 'a'.repeat(40)
const version = '2.3.16'
const createFixture = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ylc-release-proof-'))
  directories.push(directory)
  await mkdir(join(directory, 'scripts/verify'), { recursive: true })
  await mkdir(join(directory, '.output'))
  for (const file of ['release-proof.mjs', 'release-candidate.mjs']) {
    await copyFile(new URL(`./${file}`, import.meta.url), join(directory, 'scripts/verify', file))
  }
  await writeFile(join(directory, 'package.json'), JSON.stringify({ version: '9.9.9' }))
  for (const target of ['chrome', 'firefox', 'sources']) {
    await writeFile(join(directory, '.output', `youtube-live-chat-fullscreen-${version}-${target}.zip`), `Candidate ${target} bytes`)
  }
  const invoke = args =>
    execFileSync(process.execPath, [join(directory, 'scripts/verify/release-proof.mjs'), ...args], {
      cwd: directory,
      stdio: 'pipe',
      encoding: 'utf8',
    })
  invoke(['create', '--commit', commit, '--expected-version', version])
  return { directory, invoke }
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('release proof CLI', () => {
  it('verifies the selected candidate version when trusted main has moved to a newer version', async () => {
    const { invoke } = await createFixture()
    expect(invoke(['verify', '--expected-version', version, '--expected-commit', commit])).toContain(
      `Verified release proof for v${version}`,
    )
  })

  it('rejects altered artifact bytes before forwarding them', async () => {
    const { directory, invoke } = await createFixture()
    await writeFile(join(directory, '.output', `youtube-live-chat-fullscreen-${version}-chrome.zip`), 'Replaced bytes')
    expect(() => invoke(['verify', '--expected-version', version, '--expected-commit', commit])).toThrow(/does not match its proof/)
  })

  it('rejects proof metadata for a different source commit', async () => {
    const { invoke } = await createFixture()
    expect(() => invoke(['verify', '--expected-version', version, '--expected-commit', 'b'.repeat(40)])).toThrow(
      /does not match checked-out commit/,
    )
  })

  it('rejects a proof whose declared version differs from the selected candidate', async () => {
    const { directory, invoke } = await createFixture()
    const file = join(directory, '.output', `release-proof-v${version}.json`)
    const proof = JSON.parse(await readFile(file, 'utf8'))
    proof.version = '9.9.9'
    await writeFile(file, JSON.stringify(proof))
    expect(() => invoke(['verify', '--expected-version', version, '--expected-commit', commit])).toThrow(/schema or version does not match/)
  })

  it('rejects path characters in the requested version', async () => {
    const { invoke } = await createFixture()
    expect(() => invoke(['verify', '--expected-version', '../9.9.9'])).toThrow(/semver release version/)
  })
})
