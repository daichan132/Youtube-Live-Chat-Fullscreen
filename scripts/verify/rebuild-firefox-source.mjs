#!/usr/bin/env node
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const projectRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const outputDirectory = join(projectRoot, '.output')
const expectedDirectory = join(outputDirectory, 'firefox-mv2')

const findSourceZip = async () => {
  const names = await readdir(outputDirectory)
  const matches = names.filter(name => name.endsWith('-sources.zip'))
  assert.equal(matches.length, 1, `Expected one Firefox source ZIP, found: ${matches.join(', ') || 'none'}`)
  return join(outputDirectory, matches[0])
}

const inventory = async directory => {
  const result = new Map()
  const visit = async current => {
    const entries = await readdir(current, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      const absolute = join(current, entry.name)
      if (entry.isDirectory()) {
        await visit(absolute)
        continue
      }
      const info = await stat(absolute)
      const bytes = await readFile(absolute)
      result.set(relative(directory, absolute), {
        size: info.size,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      })
    }
  }
  await visit(directory)
  return result
}

const sourceZip = await findSourceZip()
await stat(expectedDirectory)
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'ylc-firefox-source-'))

try {
  await exec('unzip', ['-q', sourceZip, '-d', temporaryDirectory])
  const yarn = join(temporaryDirectory, '.yarn/releases/yarn-4.18.0.cjs')
  const environment = {
    ...process.env,
    YARN_ENABLE_HARDENED_MODE: '0',
  }
  await exec(process.execPath, [yarn, 'install', '--immutable'], {
    cwd: temporaryDirectory,
    env: environment,
    maxBuffer: 10 * 1024 * 1024,
  })
  await exec(process.execPath, [yarn, 'wxt', 'build', '-b', 'firefox'], {
    cwd: temporaryDirectory,
    env: environment,
    maxBuffer: 10 * 1024 * 1024,
  })

  const expected = await inventory(expectedDirectory)
  const rebuilt = await inventory(join(temporaryDirectory, '.output/firefox-mv2'))
  assert.deepEqual([...rebuilt.entries()], [...expected.entries()])
  console.log(`Firefox source rebuild matches ${expected.size} packaged files`)
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}
