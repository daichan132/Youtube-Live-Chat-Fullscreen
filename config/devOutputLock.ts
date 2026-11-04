import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:net'
import { resolve } from 'node:path'

/** Keep concurrent WXT servers from writing incompatible manifests and HTML to one output directory. */
export const acquireDevOutputLock = async (outDir: string): Promise<Server> => {
  const hash = createHash('sha256').update(resolve(outDir)).digest().readUInt32BE(0)
  const port = 40000 + (hash % 20000)
  const lock = createServer()
  await new Promise<void>((resolveLock, reject) => {
    lock.once('error', error =>
      reject(new Error(`Cannot lock dev output ${outDir}. Another dev server may be using it.`, { cause: error })),
    )
    lock.listen(port, '127.0.0.1', () => resolveLock())
  })
  return lock
}
