import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)
const vitestCli = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs')
const execute = promisify(execFile)

describe('Vitest project discovery', () => {
  it('discovers active specs once without collecting nested worktrees or generated output', async () => {
    const marker = `ylc-discovery-${randomUUID()}`
    const locations = ['e2e/config', '.cache/worktrees', '.output', '.wxt']
    const projects = [
      { projectName: 'core', suffix: 'unit' },
      { projectName: 'dom', suffix: 'dom' },
      { projectName: 'contracts', suffix: 'contract' },
    ]
    const directories = locations.map(location => path.join(projectRoot, location, marker))
    try {
      for (const directory of directories) {
        await mkdir(directory, { recursive: true })
        for (const { suffix } of projects) {
          await writeFile(path.join(directory, `probe.${suffix}.spec.ts`), 'throw new Error("Discovery probes must not execute")\n')
        }
      }

      const { stdout } = await execute(process.execPath, [vitestCli, 'list', '--json', '--filesOnly', marker], {
        cwd: projectRoot,
        timeout: 15_000,
        env: { ...process.env, NODE_OPTIONS: '' },
      })
      const discovered: { file: string; projectName: string }[] = JSON.parse(stdout)
      expect(discovered.sort((left, right) => left.projectName.localeCompare(right.projectName))).toEqual(
        projects
          .map(({ projectName, suffix }) => ({
            file: path.join(projectRoot, 'e2e/config', marker, `probe.${suffix}.spec.ts`),
            projectName,
          }))
          .sort((left, right) => left.projectName.localeCompare(right.projectName)),
      )
    } finally {
      await Promise.all(directories.map(directory => rm(directory, { recursive: true, force: true })))
    }
  }, 20_000)
})
