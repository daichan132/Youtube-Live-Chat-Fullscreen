import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const getCdpProcessCommand = async (port, executeFile = execFileAsync) => {
  let pidOutput
  try {
    ;({ stdout: pidOutput } = await executeFile('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']))
  } catch (error) {
    throw new Error(`Could not find the browser process listening on port ${port}: ${error.message}`)
  }

  const pids = pidOutput
    .split('\n')
    .map(pid => pid.trim())
    .filter(Boolean)

  for (const pid of pids) {
    try {
      const { stdout } = await executeFile('ps', ['-p', pid, '-o', 'command='])
      const command = stdout.trim()
      if (command) return { pid, command }
    } catch {
      // Try the next PID if this one exits between lsof and ps.
    }
  }

  throw new Error(`Could not inspect the browser process listening on port ${port}.`)
}
