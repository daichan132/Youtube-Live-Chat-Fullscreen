import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { getCdpProcessCommand } from './cdp-process.mjs'

const canonicalPath = async value => fs.realpath(path.resolve(value)).catch(() => path.resolve(value))
const isWithin = (candidate, parent) => candidate === parent || candidate.startsWith(`${parent}${path.sep}`)

// Keep debugging ports confined to an explicitly selected development profile.
export const assertVerificationProfile = async profileDir => {
  if (!profileDir) throw new Error('Pass --profile with the dedicated verification profile directory.')
  const profile = await canonicalPath(profileDir)
  const home = os.homedir()
  const configHome = process.env.XDG_CONFIG_HOME ?? path.join(home, '.config')
  const protectedRoots = [
    path.join(home, 'Library/Application Support/Google/Chrome'),
    path.join(home, 'Library/Application Support/Google/Chrome Beta'),
    path.join(home, 'Library/Application Support/Google/Chrome Canary'),
    path.join(home, 'Library/Application Support/Chromium'),
    path.join(configHome, 'google-chrome'),
    path.join(configHome, 'google-chrome-beta'),
    path.join(configHome, 'google-chrome-unstable'),
    path.join(configHome, 'chromium'),
    path.join(process.env.LOCALAPPDATA ?? path.join(home, 'AppData/Local'), 'Google/Chrome/User Data'),
    path.join(process.env.LOCALAPPDATA ?? path.join(home, 'AppData/Local'), 'Chromium/User Data'),
  ]
  for (const root of protectedRoots) {
    if (isWithin(profile, await canonicalPath(root))) {
      throw new Error('Use a dedicated development profile; the normal Chrome data directory is not supported.')
    }
  }
  return profile
}

export const commandArgument = (command, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const unquoted = name === '--remote-debugging-port' ? '[^\\s]+' : '[^\\s]+(?: [^\\s]+)*?'
  const boundary = name === '--remote-debugging-port' ? '(?=\\s|$)' : '(?=\\s--|$)'
  const match = command.match(new RegExp(`(?:^|\\s)${escaped}=(?:"([^"]*)"|'([^']*)'|(${unquoted}))${boundary}`))
  return match ? (match[1] ?? match[2] ?? match[3]) : null
}

export const verifyCdpProfile = async ({ port, profileDir, inspectProcess }) => {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('CDP port must be an integer from 1 to 65535.')
  const expectedProfile = await assertVerificationProfile(profileDir)
  const inspect = inspectProcess ?? getCdpProcessCommand
  const { pid, command } = await inspect(port)
  const actualProfile = commandArgument(command, '--user-data-dir')
  if (
    commandArgument(command, '--remote-debugging-port') !== String(port) ||
    !actualProfile ||
    (await canonicalPath(actualProfile)) !== expectedProfile
  ) {
    throw new Error('The CDP listener does not match the requested verification profile and port.')
  }
  return { pid, profileDir: expectedProfile }
}

export const createBackgroundPage = async (browser, url) => {
  const cdp = await browser.newBrowserCDPSession()
  let targetId
  try {
    ;({ targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', background: true, focus: false }))
  } finally {
    await cdp.detach()
  }
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    for (const context of browser.contexts()) {
      for (const page of context.pages()) {
        const session = await context.newCDPSession(page)
        try {
          const { targetInfo } = await session.send('Target.getTargetInfo')
          if (targetInfo.targetId === targetId) {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
            return page
          }
        } finally {
          await session.detach()
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('The owned background target was not attached.')
}

export const findLoadedExtension = async (browser, extensionPath) => {
  const expectedPath = await canonicalPath(extensionPath)
  const manager = await createBackgroundPage(browser, 'chrome://extensions/')
  try {
    await manager.waitForLoadState('domcontentloaded')
    await manager.waitForFunction(() => typeof chrome.developerPrivate?.getExtensionsInfo === 'function')
    const extensions = await manager.evaluate(
      () =>
        new Promise((resolve, reject) => {
          chrome.developerPrivate.getExtensionsInfo(items => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
            else
              resolve(items.map(item => ({ id: item.id, path: item.path ?? '', version: item.version, enabled: item.state === 'ENABLED' })))
          })
        }),
    )
    for (const extension of extensions) {
      if (extension.path && (await canonicalPath(extension.path)) === expectedPath) {
        if (!extension.enabled) throw new Error('The expected unpacked extension is disabled.')
        return extension
      }
    }
    throw new Error(`The expected unpacked extension is not installed: ${expectedPath}`)
  } finally {
    await manager.close()
  }
}
