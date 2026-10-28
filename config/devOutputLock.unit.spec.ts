import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { acquireDevOutputLock } from './devOutputLock'

it('prevents concurrent writers and releases the output when the owner closes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ylc-dev-lock-'))
  const owner = await acquireDevOutputLock(dir)
  try {
    await expect(acquireDevOutputLock(dir)).rejects.toThrow('Another dev server may be using it')
  } finally {
    await new Promise<void>((resolve, reject) => owner.close(error => (error ? reject(error) : resolve())))
  }
  const next = await acquireDevOutputLock(dir)
  await new Promise<void>((resolve, reject) => next.close(error => (error ? reject(error) : resolve())))
  rmSync(dir, { recursive: true, force: true })
})
