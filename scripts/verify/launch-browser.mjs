#!/usr/bin/env node
/* biome-ignore-all lint/suspicious/noConsole: verification CLI prints status and diagnostics */
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from '@playwright/test'

const DEFAULT_URL = 'https://www.youtube.com/watch?v=EWrX250Zhko'
const DEFAULT_PORT = 9335
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

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const commandHasArg = (command, name, expectedValue) => {
  const escapedName = escapeRegExp(name)
  const escapedValue = escapeRegExp(String(expectedValue))
  return new RegExp(`(?:^|\\s)${escapedName}=(?:${escapedValue}|"${escapedValue}"|'${escapedValue}')(?=\\s|$)`).test(command)
}

export const ensureExistingBrowserMatchesTarget = async ({
  port,
  profileDir,
  extensionPath,
  executeFile = execFileAsync,
}) => {
  const { pid, command } = await getCdpProcessCommand(port, executeFile)
  const expectedPortArg = `--remote-debugging-port=${port}`
  const expectedProfileArg = `--user-data-dir=${profileDir}`
  const expectedExtensionArg = `--load-extension=${extensionPath}`

  if (
    commandHasArg(command, '--remote-debugging-port', port) &&
    commandHasArg(command, '--user-data-dir', profileDir) &&
    commandHasArg(command, '--load-extension', extensionPath)
  ) {
    return { pid, command }
  }

  throw new Error(
    [
      `A browser is already listening on port ${port}, but it is not the expected verification browser.`,
      `Expected process args: ${expectedPortArg}, ${expectedProfileArg}, and ${expectedExtensionArg}`,
      `Actual PID: ${pid}`,
      `Actual command: ${command}`,
      'Close the process using that port, or rerun with a different --port.',
    ].join('\n'),
  )
}

const parseArgs = argv => {
  const args = new Map()
  const positionals = []
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) {
      positionals.push(arg)
      continue
    }

    const [rawKey, inlineValue] = arg.slice(2).split('=', 2)
    const value = inlineValue ?? argv[index + 1]
    args.set(rawKey, value)
    if (inlineValue === undefined) index += 1
  }
  return { args, positionals }
}

const main = async () => {
  const { args, positionals } = parseArgs(process.argv)
  const rootDir = process.cwd()
  const extensionPath = path.resolve(rootDir, args.get('extension') ?? '.output/chrome-mv3')
  const manifestPath = path.join(extensionPath, 'manifest.json')
  const port = Number(args.get('port') ?? process.env.YLC_VERIFY_PORT ?? DEFAULT_PORT)
  const url = positionals[0] ?? args.get('url') ?? process.env.YLC_VERIFY_URL ?? DEFAULT_URL
  const profileDir = path.resolve(
    args.get('profile') ?? process.env.YLC_VERIFY_PROFILE ?? path.join('/private/tmp', `ylc-verify-profile-${port}`),
  )
  const ownsProfileDir = !args.has('profile') && !process.env.YLC_VERIFY_PROFILE
  const cdpUrl = `http://127.0.0.1:${port}`

  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Missing extension manifest: ${manifestPath}\nRun \`yarn build\` first. Verification must use .output/chrome-mv3, not .output/chrome-mv3-dev.`,
    )
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (!Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) {
    throw new Error(`Extension manifest has no content_scripts: ${manifestPath}\nUse the built extension output, usually \`.output/chrome-mv3\`.`)
  }

  const muteVideos = async page => {
    await page
      .evaluate(() => {
        for (const video of document.querySelectorAll('video')) {
          video.volume = 0
          video.muted = true
        }
      })
      .catch(() => null)
  }

  const connectToExistingBrowser = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 500)

    try {
      const response = await fetch(`${cdpUrl}/json/version`, { signal: controller.signal })
      if (!response.ok) return null

      return await chromium.connectOverCDP(cdpUrl)
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  const existingBrowser = await connectToExistingBrowser()
  if (existingBrowser) {
    let verifiedProcess
    try {
      verifiedProcess = await ensureExistingBrowserMatchesTarget({ port, profileDir, extensionPath })
    } catch (error) {
      await existingBrowser.close().catch(() => null)
      throw error
    }

    try {
      const context = existingBrowser.contexts()[0]
      const page = context?.pages()[0] ?? (context ? await context.newPage() : null)
      if (!page) throw new Error(`Existing browser on ${cdpUrl} has no usable context.`)

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await muteVideos(page)

      console.log(
        JSON.stringify(
          {
            status: 'reused',
            app: 'Google Chrome for Testing',
            url,
            extensionPath,
            profileDir,
            cdp: cdpUrl,
            verifiedProcess: { pid: verifiedProcess.pid, profileDir },
            inspect: `yarn verify:overlay --port ${port}`,
          },
          null,
          2,
        ),
      )
      console.log('Reused the existing verification browser. No new Chrome for Testing process was launched.')
    } finally {
      await existingBrowser.close().catch(() => null)
    }
    return
  }

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: null,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--remote-debugging-port=${port}`,
      '--window-size=1280,900',
      '--no-first-run',
      '--no-default-browser-check',
      '--mute-audio',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  })

  await context.addInitScript(() => {
    const mute = () => {
      for (const video of document.querySelectorAll('video')) {
        video.volume = 0
        video.muted = true
      }
    }
    document.addEventListener('play', mute, true)
    document.addEventListener('volumechange', mute, true)
    setInterval(mute, 1000)
  })

  const page = context.pages()[0] ?? (await context.newPage())
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await muteVideos(page)

  console.log(
    JSON.stringify(
      {
        status: 'ready',
        app: 'Google Chrome for Testing',
        url,
        extensionPath,
        profileDir,
        cdp: cdpUrl,
        inspect: `yarn verify:overlay --port ${port}`,
      },
      null,
      2,
    ),
  )
  console.log('Keep this process running while using Computer Use. Press Ctrl+C to close the verification browser.')

  const keepAlive = setInterval(() => {}, 1 << 30)

  const shutdown = async () => {
    clearInterval(keepAlive)
    await context.close().catch(() => null)
    if (ownsProfileDir) fs.rmSync(profileDir, { recursive: true, force: true })
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

const isDirectExecution = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectExecution) {
  await main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
