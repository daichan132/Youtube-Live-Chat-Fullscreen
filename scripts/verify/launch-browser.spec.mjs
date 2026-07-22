import { describe, expect, it } from 'vitest'
import { ensureExistingBrowserMatchesTarget, getCdpProcessCommand } from './launch-browser.mjs'

const createProcessInspector = ({ pids = ['101'], commands = {} } = {}) => async (file, args) => {
  if (file === 'lsof') return { stdout: `${pids.join('\n')}\n` }
  if (file !== 'ps') throw new Error(`Unexpected executable: ${file}`)

  const pid = args[1]
  const command = commands[pid]
  if (command instanceof Error) throw command
  if (!command) throw new Error(`Missing command for PID ${pid}`)
  return { stdout: `${command}\n` }
}

const target = {
  port: 9335,
  profileDir: '/private/tmp/ylc-verify-profile-9335',
  extensionPath: '/workspace/.output/chrome-mv3',
}

const chromeCommand = (...args) =>
  ['/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', ...args].join(' ')

describe('verification browser process matching', () => {
  it('reuses the listener only when port, profile, and extension match', async () => {
    const command = chromeCommand(
      `--remote-debugging-port=${target.port}`,
      `--user-data-dir=${target.profileDir}`,
      `--load-extension=${target.extensionPath}`,
    )
    const executeFile = createProcessInspector({ commands: { 101: command } })

    await expect(ensureExistingBrowserMatchesTarget({ ...target, executeFile })).resolves.toEqual({
      pid: '101',
      command,
    })
  })

  it('rejects disable-extensions-except without a matching load-extension argument', async () => {
    const command = chromeCommand(
      `--remote-debugging-port=${target.port}`,
      `--user-data-dir=${target.profileDir}`,
      `--disable-extensions-except=${target.extensionPath}`,
    )
    const executeFile = createProcessInspector({ commands: { 101: command } })

    await expect(ensureExistingBrowserMatchesTarget({ ...target, executeFile })).rejects.toThrow(
      `--load-extension=${target.extensionPath}`,
    )
  })

  it('rejects a browser on the same port when it uses a different profile', async () => {
    const command = chromeCommand(
      `--remote-debugging-port=${target.port}`,
      '--user-data-dir=/private/tmp/another-profile',
      `--load-extension=${target.extensionPath}`,
    )
    const executeFile = createProcessInspector({ commands: { 101: command } })

    await expect(ensureExistingBrowserMatchesTarget({ ...target, executeFile })).rejects.toThrow(
      'not the expected verification browser',
    )
  })

  it('rejects a matching browser profile when the extension argument is missing', async () => {
    const command = chromeCommand(
      `--remote-debugging-port=${target.port}`,
      `--user-data-dir=${target.profileDir}`,
    )
    const executeFile = createProcessInspector({ commands: { 101: command } })

    await expect(ensureExistingBrowserMatchesTarget({ ...target, executeFile })).rejects.toThrow(
      `--load-extension=${target.extensionPath}`,
    )
  })

  it('rejects a matching browser profile when a different extension is loaded', async () => {
    const command = chromeCommand(
      `--remote-debugging-port=${target.port}`,
      `--user-data-dir=${target.profileDir}`,
      '--load-extension=/workspace/.output/another-extension',
    )
    const executeFile = createProcessInspector({ commands: { 101: command } })

    await expect(ensureExistingBrowserMatchesTarget({ ...target, executeFile })).rejects.toThrow(
      'not the expected verification browser',
    )
  })

  it('rejects a different process that happens to listen on the requested port', async () => {
    const command = 'node local-debug-server.mjs --port 9335'
    const executeFile = createProcessInspector({ commands: { 101: command } })

    await expect(ensureExistingBrowserMatchesTarget({ ...target, executeFile })).rejects.toThrow(
      'Actual command: node local-debug-server.mjs --port 9335',
    )
  })

  it('continues to the next listener PID when a process exits during inspection', async () => {
    const expectedCommand = chromeCommand(
      `--remote-debugging-port=${target.port}`,
      `--user-data-dir=${target.profileDir}`,
      `--load-extension=${target.extensionPath}`,
    )
    const executeFile = createProcessInspector({
      pids: ['101', '202'],
      commands: { 101: new Error('process exited'), 202: expectedCommand },
    })

    await expect(getCdpProcessCommand(target.port, executeFile)).resolves.toEqual({
      pid: '202',
      command: expectedCommand,
    })
  })
})
