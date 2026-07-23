#!/usr/bin/env node
/* biome-ignore-all lint/suspicious/noConsole: verification CLI prints status and diagnostics */
import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const reportFatalError = error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

process.on('uncaughtException', reportFatalError)
process.on('unhandledRejection', reportFatalError)

const DEFAULT_URL = 'https://www.youtube.com/watch?v=EWrX250Zhko'
const DEFAULT_PORT = 9336
const DEFAULT_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const DEFAULT_SETUP_TIMEOUT_MS = 10 * 60 * 1000
const BOOLEAN_ARGS = new Set(['dev', 'setup-extension'])

const args = new Map()
const positionals = []
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index]
  if (!arg.startsWith('--')) {
    positionals.push(arg)
    continue
  }

  const [rawKey, inlineValue] = arg.slice(2).split('=', 2)
  if (BOOLEAN_ARGS.has(rawKey)) {
    args.set(rawKey, inlineValue ?? 'true')
    continue
  }

  const value = inlineValue ?? process.argv[index + 1]
  args.set(rawKey, value)
  if (inlineValue === undefined) index += 1
}

const rootDir = process.cwd()
const devMode = args.has('dev')
const defaultExtensionOutput = devMode ? '.output/chrome-mv3-dev' : '.output/chrome-mv3'
const extensionPath = path.resolve(rootDir, args.get('extension') ?? defaultExtensionOutput)
const manifestPath = path.join(extensionPath, 'manifest.json')
const port = Number(args.get('port') ?? process.env.YLC_VERIFY_CHROME_PORT ?? DEFAULT_PORT)
const setupExtension = args.has('setup-extension')
const setupTimeoutMs = Number(args.get('timeout-ms') ?? process.env.YLC_VERIFY_CHROME_SETUP_TIMEOUT_MS ?? DEFAULT_SETUP_TIMEOUT_MS)
const requestedUrl = positionals[0] ?? args.get('url') ?? process.env.YLC_VERIFY_URL ?? DEFAULT_URL
const url = setupExtension ? 'chrome://extensions/' : requestedUrl
const chromePath = args.get('chrome') ?? process.env.YLC_CHROME_PATH ?? DEFAULT_CHROME_PATH
const profileDir =
  args.get('profile') ?? process.env.YLC_VERIFY_CHROME_PROFILE ?? path.join(os.homedir(), 'Library/Application Support/YLC Verify Chrome')
const cdpUrl = `http://127.0.0.1:${port}`
const execFileAsync = promisify(execFile)
let cdpMessageId = 0

if (!fs.existsSync(chromePath)) {
  console.error(`Missing Google Chrome binary: ${chromePath}`)
  console.error('Set YLC_CHROME_PATH or pass --chrome "/path/to/Google Chrome".')
  process.exit(1)
}

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing extension manifest: ${manifestPath}`)
  console.error(
    devMode
      ? 'Run `yarn dev` first. Dev verification uses .output/chrome-mv3-dev.'
      : 'Run `yarn build` first. Logged-in verification uses the built extension output.',
  )
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const hasStaticContentScripts = Array.isArray(manifest.content_scripts) && manifest.content_scripts.length > 0
const hasDevScriptingRuntime =
  Boolean(manifest.background?.service_worker) && Array.isArray(manifest.permissions) && manifest.permissions.includes('scripting')
if (!hasStaticContentScripts && !hasDevScriptingRuntime) {
  console.error(`Extension manifest cannot inject content scripts: ${manifestPath}`)
  console.error('Use `.output/chrome-mv3`, or run `yarn dev` before loading `.output/chrome-mv3-dev`.')
  process.exit(1)
}

const getDevServerWebSocketUrls = () => {
  const extensionPagesCsp = manifest.content_security_policy?.extension_pages ?? ''
  const match = extensionPagesCsp.match(/http:\/\/localhost:(\d+)/)
  if (!match) return []
  return [`ws://localhost:${match[1]}`, `ws://[::1]:${match[1]}`]
}

const waitForDevServer = async () => {
  const webSocketUrls = getDevServerWebSocketUrls()
  if (webSocketUrls.length === 0) {
    console.error('Could not detect the WXT dev server URL from the dev manifest.')
    console.error('Run `yarn dev` and then retry `yarn verify:dev`.')
    process.exit(1)
  }

  const startedAt = Date.now()
  while (Date.now() - startedAt < 10_000) {
    for (const webSocketUrl of webSocketUrls) {
      const connected = await new Promise(resolve => {
        const socket = new WebSocket(webSocketUrl, 'vite-hmr')
        const timeout = setTimeout(() => {
          socket.close()
          resolve(false)
        }, 1000)

        socket.addEventListener('open', () => {
          clearTimeout(timeout)
          socket.close()
          resolve(true)
        })
        socket.addEventListener('error', () => {
          clearTimeout(timeout)
          resolve(false)
        })
      })
      if (connected) return webSocketUrl
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.error(`Could not connect to the WXT dev server: ${webSocketUrls.join(' or ')}`)
  console.error('Run `yarn dev` and keep it running, then retry `yarn verify:dev`.')
  process.exit(1)
}

const devServerWebSocketUrl = devMode ? await waitForDevServer() : null

const readLocaleMessage = locale => {
  const messagesPath = path.join(extensionPath, '_locales', locale, 'messages.json')
  if (!fs.existsSync(messagesPath)) return null

  try {
    return JSON.parse(fs.readFileSync(messagesPath, 'utf8')).extensionName?.message ?? null
  } catch {
    return null
  }
}

const expectedExtensionNames = new Set(
  [readLocaleMessage(manifest.default_locale ?? 'en'), readLocaleMessage('ja'), manifest.name].filter(Boolean).map(name => name.trim()),
)

const getExistingBrowserVersion = async () => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 500)

  try {
    const response = await fetch(`${cdpUrl}/json/version`, { signal: controller.signal })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

const getCdpJson = async pathName => {
  const response = await fetch(`${cdpUrl}${pathName}`)
  if (!response.ok) throw new Error(`CDP request failed: ${response.status} ${response.statusText}`)
  return await response.json()
}

const waitForCdp = async () => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 10_000) {
    const version = await getExistingBrowserVersion()
    if (version) return version
    await new Promise(resolve => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for ${cdpUrl}`)
}

const openInExistingBrowser = async () => {
  const encodedUrl = encodeURIComponent(url)

  for (const method of ['PUT', 'GET']) {
    try {
      const response = await fetch(`${cdpUrl}/json/new?${encodedUrl}`, { method })
      if (response.ok) return true
    } catch {
      // Try the next method because Chrome versions differ on this endpoint.
    }
  }

  return false
}

const runCdpCommand = async (webSocketDebuggerUrl, method, params = {}) =>
  new Promise((resolve, reject) => {
    cdpMessageId += 1
    const id = cdpMessageId
    const socket = new WebSocket(webSocketDebuggerUrl)
    const timeout = setTimeout(() => {
      socket.close()
      reject(new Error(`Timed out running CDP command ${method}`))
    }, 5000)

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ id, method, params }))
    })

    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data)
      if (message.id !== id) return
      clearTimeout(timeout)
      socket.close()
      if (message.error) {
        reject(new Error(`${message.error.message}: ${message.error.data ?? ''}`.trim()))
        return
      }
      resolve(message.result)
    })

    socket.addEventListener('error', () => {
      clearTimeout(timeout)
      reject(new Error(`Failed to connect to ${webSocketDebuggerUrl}`))
    })
  })

const getExtensionsPage = async () => {
  const pages = await getCdpJson('/json/list')
  return pages.find(page => page.url === 'chrome://extensions/')
}

const evaluateOnPage = async (page, expression) => {
  const result = await runCdpCommand(page.webSocketDebuggerUrl, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Runtime.evaluate failed')
  }

  return result.result?.value
}

const getInstalledExtensions = async () => {
  const page = await getExtensionsPage()
  if (!page) return []

  return (
    (await evaluateOnPage(
      page,
      `new Promise((resolve) => {
        chrome.developerPrivate.getExtensionsInfo((items) => {
          resolve(items.map((item) => ({
            id: item.id,
            name: item.name,
            path: item.path ?? '',
            enabled: item.enabled,
            state: item.state,
          })))
        })
      })`,
    )) ?? []
  )
}

const normalizeExtensionPath = extensionPath => (extensionPath ? path.resolve(extensionPath) : '')

const findExpectedExtension = extensions =>
  extensions.find(extension => {
    return normalizeExtensionPath(extension.path) === extensionPath
  })

const findSameNamedExtension = extensions =>
  extensions.find(extension => expectedExtensionNames.has(extension.name) && normalizeExtensionPath(extension.path) !== extensionPath)

const waitForManualExtensionLoad = async () => {
  console.log('')
  console.log('Manual step required in the opened YLC Verify Chrome window:')
  console.log('1. Click "Load unpacked" / "パッケージ化されていない拡張機能を読み込む"')
  console.log(`2. Select: ${extensionPath}`)
  console.log('3. If it was already loaded, click reload on the extension card after each build.')
  console.log('')
  console.log(`Waiting up to ${Math.round(setupTimeoutMs / 1000)}s for the extension to appear...`)

  const startedAt = Date.now()
  while (Date.now() - startedAt < setupTimeoutMs) {
    const extensions = await getInstalledExtensions()
    const expectedExtension = findExpectedExtension(extensions)
    if (expectedExtension) return expectedExtension
    const sameNamedExtension = findSameNamedExtension(extensions)
    if (sameNamedExtension) {
      console.log(`Found same-name extension at a different path: ${sameNamedExtension.path || '(path unavailable)'}`)
      console.log(`Still waiting for exact path: ${extensionPath}`)
    }
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  throw new Error(`Timed out waiting for manual Load unpacked: ${extensionPath}`)
}

const reloadInstalledExtension = async extension => {
  const page = await getExtensionsPage()
  if (!page) throw new Error('chrome://extensions/ is not open; cannot reload the extension.')

  await evaluateOnPage(
    page,
    `new Promise((resolve, reject) => {
      chrome.developerPrivate.reload(${JSON.stringify(extension.id)}, { failQuietly: false }, () => {
        const error = chrome.runtime.lastError
        if (error) reject(new Error(error.message))
        else resolve(true)
      })
    })`,
  )
  await new Promise(resolve => setTimeout(resolve, 1500))
}

const openUrlInCdpBrowser = async targetUrl => {
  const encodedUrl = encodeURIComponent(targetUrl)
  for (const method of ['PUT', 'GET']) {
    const response = await fetch(`${cdpUrl}/json/new?${encodedUrl}`, { method })
    if (response.ok) return await response.json()
  }

  throw new Error(`Could not open ${targetUrl} in ${cdpUrl}`)
}

const getCdpProcessCommand = async () => {
  let pidOutput
  try {
    ;({ stdout: pidOutput } = await execFileAsync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']))
  } catch (error) {
    throw new Error(`Could not find the Chrome process listening on ${cdpUrl}: ${error.message}`)
  }

  const pids = pidOutput
    .split('\n')
    .map(pid => pid.trim())
    .filter(Boolean)

  for (const pid of pids) {
    try {
      const { stdout } = await execFileAsync('ps', ['-p', pid, '-o', 'command='])
      const command = stdout.trim()
      if (command) return { pid, command }
    } catch {
      // Try the next PID if this one exits between lsof and ps.
    }
  }

  throw new Error(`Could not inspect the Chrome process listening on ${cdpUrl}.`)
}

const ensureExistingBrowserMatchesTarget = async () => {
  const { pid, command } = await getCdpProcessCommand()
  const expectedPortArg = `--remote-debugging-port=${port}`
  const expectedProfileArg = `--user-data-dir=${profileDir}`

  if (command.includes(expectedPortArg) && command.includes(expectedProfileArg)) {
    return { pid, command }
  }

  console.error(`A browser is already listening on ${cdpUrl}, but it is not the logged-in verification Chrome.`)
  console.error(`Expected process args: ${expectedPortArg} and ${expectedProfileArg}`)
  console.error(`Actual PID: ${pid}`)
  console.error(`Actual command: ${command}`)
  console.error('Close the process using that port, or rerun with a different --port.')
  process.exit(1)
}

const existingBrowser = await getExistingBrowserVersion()
const verifyChromeCommand = devMode ? `yarn verify:dev --port ${port}` : `yarn verify:chrome --port ${port}`
if (existingBrowser) {
  const verifiedProcess = await ensureExistingBrowserMatchesTarget()
  await openInExistingBrowser()
  console.log(
    JSON.stringify(
      {
        status: 'reused',
        app: 'Google Chrome',
        url,
        extensionPath,
        devServerWebSocketUrl,
        profileDir,
        extensionInstall: 'manual-load-unpacked',
        cdp: cdpUrl,
        verifiedProcess: {
          pid: verifiedProcess.pid,
          profileDir,
        },
        setup: devMode ? `yarn verify:dev --port ${port}` : `yarn verify:chrome --setup-extension --port ${port}`,
        inspect: `yarn verify:overlay --port ${port}`,
      },
      null,
      2,
    ),
  )
  console.log('Reused the existing logged-in verification Chrome. No new Chrome process was launched.')
  console.log(`If the extension is not listed, open chrome://extensions and Load unpacked: ${extensionPath}`)
  if (setupExtension) {
    const extension = await waitForManualExtensionLoad()
    console.log(`Detected extension: ${extension.name} (${extension.id})`)
    await reloadInstalledExtension(extension)
    console.log(`Reloaded extension: ${extension.name} (${extension.id})`)
    const openedPage = await openUrlInCdpBrowser(requestedUrl)
    console.log(`Opened verification URL: ${openedPage.url ?? requestedUrl}`)
  }
  process.exit(0)
}

fs.mkdirSync(profileDir, { recursive: true })

const chromeArgs = [
  `--user-data-dir=${profileDir}`,
  `--remote-debugging-port=${port}`,
  '--window-size=1280,900',
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  url,
]

const child = spawn(chromePath, chromeArgs, {
  detached: true,
  stdio: 'ignore',
})
child.unref()
await waitForCdp()

console.log(
  JSON.stringify(
    {
      status: 'ready',
      app: 'Google Chrome',
      url,
      extensionPath,
      devServerWebSocketUrl,
      profileDir,
      extensionInstall: 'manual-load-unpacked',
      cdp: cdpUrl,
      setup: devMode ? `yarn verify:dev --port ${port}` : `yarn verify:chrome --setup-extension --port ${port}`,
      inspect: `yarn verify:overlay --port ${port}`,
    },
    null,
    2,
  ),
)
console.log('Use this normal Chrome window for logged-in verification. Sign in once; the profile is persistent.')
console.log(`Verification command: ${verifyChromeCommand}`)
console.log(
  `Google Chrome 137+ does not load unpacked extensions from --load-extension. Load unpacked once from chrome://extensions: ${extensionPath}`,
)

if (setupExtension) {
  const extension = await waitForManualExtensionLoad()
  console.log(`Detected extension: ${extension.name} (${extension.id})`)
  await reloadInstalledExtension(extension)
  console.log(`Reloaded extension: ${extension.name} (${extension.id})`)
  const openedPage = await openUrlInCdpBrowser(requestedUrl)
  console.log(`Opened verification URL: ${openedPage.url ?? requestedUrl}`)
}
