import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { mkdir, writeFile, readFile, mkdtemp, realpath, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import net from 'node:net'

export async function startFirefox({ firefox, extensionPath, out, port }) {
  const profile = await realpath(await mkdtemp(join(tmpdir(), 'ylc-firefox-delay-profile-')))
  const extensionId =
    JSON.parse(await readFile(`${extensionPath}/manifest.json`, 'utf8')).browser_specific_settings?.gecko?.id ??
    '{6fecd3d1-1743-4913-af18-f30d06d1fad6}'
  const uuid = randomUUID()
  const headless = true
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
  await mkdir(profile, { recursive: true })
  const preferences = {
    'app.update.auto': false,
    'app.update.disabledForTesting': true,
    'app.update.enabled': false,
    'media.volume_scale': '0.0',
    'media.default_volume': '0.0',
    'media.autoplay.default': 5,
    'browser.aboutwelcome.enabled': false,
    'browser.shell.checkDefaultBrowser': false,
    'browser.startup.homepage_override.mstone': 'ignore',
    'browser.startup.page': 0,
    'browser.fullscreen.autohide': true,
    'remote.experimental.enabled': true,
    'remote.screenshot.use_readback': false,
    'devtools.debugger.remote-enabled': true,
    'devtools.debugger.prompt-connection': false,
    'marionette.port': port,
    'toolkit.telemetry.enabled': false,
    'datareporting.policy.dataSubmissionEnabled': false,
    'datareporting.healthreport.uploadEnabled': false,
    'extensions.webextensions.uuids': JSON.stringify({ [extensionId]: uuid }),
  }
  await writeFile(
    `${profile}/user.js`,
    Object.entries(preferences)
      .map(([key, value]) => `user_pref(${JSON.stringify(key)}, ${JSON.stringify(value)});`)
      .join('\n'),
  )
  const browser = spawn(
    firefox,
    [
      ...(headless ? ['--headless'] : []),
      '--new-instance',
      '--remote-allow-system-access',
      '--marionette',
      '-profile',
      profile,
      '--remote-debugging-port',
      '0',
      '--width',
      '1000',
      '--height',
      '850',
      'about:blank',
    ],
    { env: { ...process.env, MOZ_DISABLE_UPDATE_PROCESSING: '1' }, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  await writeFile(`${out}/startup-owner.json`, JSON.stringify({ pid: browser.pid, profile }))
  browser.on('error', () => {})
  browser.unref()
  browser.stdout.unref?.()
  browser.stderr.unref?.()
  const browserLogCounts = { stdoutChunks: 0, stderrChunks: 0 }
  browser.stdout.on('data', () => browserLogCounts.stdoutChunks++)
  browser.stderr.on('data', () => browserLogCounts.stderrChunks++)
  // No automatic signals: a failed startup must never terminate an updater.
  let tcp
  for (let attempt = 0; attempt < 300; attempt++) {
    try {
      tcp = await new Promise((resolve, reject) => {
        const socket = net.createConnection({ host: '127.0.0.1', port })
        socket.once('connect', () => resolve(socket))
        socket.once('error', reject)
      })
      break
    } catch {
      await delay(100)
    }
  }
  if (!tcp) throw new Error('Marionette did not start')
  let marionetteSequence = 0
  const marionettePending = new Map()
  let marionetteBuffer = Buffer.alloc(0)
  let handshake
  tcp.on('data', chunk => {
    marionetteBuffer = Buffer.concat([marionetteBuffer, chunk])
    while (true) {
      const colon = marionetteBuffer.indexOf(58)
      if (colon < 0) return
      const bytes = Number(marionetteBuffer.subarray(0, colon).toString())
      if (marionetteBuffer.length < colon + 1 + bytes) return
      const packet = JSON.parse(marionetteBuffer.subarray(colon + 1, colon + 1 + bytes).toString())
      marionetteBuffer = marionetteBuffer.subarray(colon + 1 + bytes)
      if (!Array.isArray(packet)) {
        handshake = packet
        continue
      }
      const entry = marionettePending.get(packet[1])
      if (!entry) continue
      marionettePending.delete(packet[1])
      if (packet[2]) entry.reject(new Error(JSON.stringify(packet[2])))
      else entry.resolve(packet[3])
    }
  })
  tcp.on('close', () => {
    for (const e of marionettePending.values()) e.reject(new Error('Owned Firefox connection closed'))
    marionettePending.clear()
  })
  const marionette = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++marionetteSequence
      const timeout = setTimeout(() => {
        marionettePending.delete(id)
        reject(new Error('Marionette timed out: ' + method))
      }, 20000)
      marionettePending.set(id, {
        resolve: value => {
          clearTimeout(timeout)
          resolve(value)
        },
        reject: error => {
          clearTimeout(timeout)
          reject(error)
        },
      })
      const packet = JSON.stringify([0, id, method, params])
      tcp.write(Buffer.byteLength(packet) + ':' + packet)
    })
  await delay(100)
  const session = await marionette('WebDriver:NewSession', { webSocketUrl: true })
  if (session.capabilities?.['moz:processID'] !== browser.pid || session.capabilities?.['moz:profile'] !== profile)
    throw new Error('Firefox session ownership mismatch')

  const websocketUrl = session.capabilities?.webSocketUrl
  const ws = new WebSocket(websocketUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  let sequence = 0
  const pending = new Map()
  const eventHandlers = new Set()
  const events = []
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id !== undefined) {
      const entry = pending.get(message.id)
      if (!entry) return
      pending.delete(message.id)
      if (message.type === 'error') entry.reject(new Error(`${message.error}: ${message.message}`))
      else entry.resolve(message.result)
    } else {
      for (const handler of eventHandlers) {
        try {
          handler(message)
        } catch {}
      }
    }
  })
  const cmd = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence
      const timeout = setTimeout(() => {
        pending.delete(id)
        reject(new Error('BiDi timed out: ' + method))
      }, 20000)
      pending.set(id, {
        resolve: value => {
          clearTimeout(timeout)
          resolve(value)
        },
        reject: error => {
          clearTimeout(timeout)
          reject(error)
        },
      })
      ws.send(JSON.stringify({ id, method, params }))
    })
  const install = await cmd('webExtension.install', { extensionData: { type: 'path', path: extensionPath } })
  const execute = async script =>
    (await marionette('WebDriver:ExecuteScript', { script, args: [], newSandbox: false, sandbox: 'default', scriptTimeout: 15000 }))?.value
  const evaluate = async (context, expression) => {
    const response = await cmd('script.evaluate', { expression, target: { context }, awaitPromise: true, userActivation: true })
    if (response.type === 'exception') throw new Error(JSON.stringify(response.exceptionDetails))
    return response.result
  }
  const screenshot = async name => {
    const result = await marionette('WebDriver:TakeScreenshot', {})
    const data = typeof result === 'string' ? result : result.value
    const path = `${out}/${name}.png`
    await writeFile(path, Buffer.from(data, 'base64'))
    return path
  }
  const key = value =>
    marionette('WebDriver:PerformActions', {
      actions: [
        {
          type: 'key',
          id: 'keyboard',
          actions: [
            { type: 'keyDown', value },
            { type: 'keyUp', value },
          ],
        },
      ],
    })
  const click = (x, y) =>
    marionette('WebDriver:PerformActions', {
      actions: [
        {
          type: 'pointer',
          id: 'mouse',
          parameters: { pointerType: 'mouse' },
          actions: [
            { type: 'pointerMove', x, y, duration: 0 },
            { type: 'pointerDown', button: 0 },
            { type: 'pointerUp', button: 0 },
          ],
        },
      ],
    })
  const chrome = async script => {
    await marionette('Marionette:SetContext', { value: 'chrome' })
    try {
      return await execute(script)
    } finally {
      await marionette('Marionette:SetContext', { value: 'content' })
    }
  }
  const api = {
    browserLogCounts,
    cmd,
    marionette,
    execute,
    evaluate,
    screenshot,
    key,
    click,
    chrome,
    events,
    eventHandlers,
    delay,
    out,
    profile,
    uuid,
    origin: `moz-extension://${uuid}`,
    extensionPath,
    browser,
    session,
  }
  api.close = async () => {
    try {
      await marionette('Marionette:Quit', { flags: ['eAttemptQuit'] })
      if (browser.exitCode === null)
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Owned Firefox has not exited')), 10000)
          browser.once('exit', () => {
            clearTimeout(timer)
            resolve()
          })
        })
      await rm(profile, { recursive: true, force: true })
    } finally {
      ws.close()
      tcp.destroy()
    }
  }
  return api
}
