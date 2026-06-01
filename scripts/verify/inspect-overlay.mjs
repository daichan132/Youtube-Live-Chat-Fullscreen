#!/usr/bin/env node
/* biome-ignore-all lint/suspicious/noConsole: verification CLI prints status and diagnostics */
import { chromium } from '@playwright/test'

const DEFAULT_PORT = 9335

const args = new Map()
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index]
  if (!arg.startsWith('--')) continue

  const [rawKey, inlineValue] = arg.slice(2).split('=', 2)
  const value = inlineValue ?? process.argv[index + 1]
  args.set(rawKey, value)
  if (inlineValue === undefined) index += 1
}

const port = Number(args.get('port') ?? process.env.YLC_VERIFY_PORT ?? DEFAULT_PORT)
const targetUrlPart = args.get('url-includes') ?? 'youtube.com/watch'
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)

try {
  const pages = browser.contexts().flatMap(context => context.pages())
  const page = pages.find(candidate => candidate.url().includes(targetUrlPart))

  if (!page) {
    console.error(`No page found for url fragment: ${targetUrlPart}`)
    console.error(`Open one with: yarn verify:browser --port ${port}`)
    process.exit(1)
  }

  const state = await page.evaluate(() => {
    const findDeep = predicate => {
      let found = null

      const walk = root => {
        for (const element of root.querySelectorAll('*')) {
          if (predicate(element)) {
            found = element
            return
          }
          if (element.shadowRoot) {
            walk(element.shadowRoot)
            if (found) return
          }
        }
      }

      walk(document)
      return found
    }

    const rectOf = element => {
      if (!element) return null
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      return {
        tag: element.tagName.toLowerCase(),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        display: style.display,
        background: style.backgroundColor,
        transform: style.transform,
      }
    }

    const controlRail = findDeep(element => element.hasAttribute('data-ylc-control-rail'))
    const frame = findDeep(element => element.hasAttribute('data-ylc-draggable-frame'))
    const resizable = findDeep(element => element.hasAttribute('data-ylc-resizable'))
    const chatInner = findDeep(element => element.hasAttribute('data-ylc-chat-inner'))
    const settingsButton = findDeep(element => element.hasAttribute('data-ylc-settings-btn'))
    const dragHandle = findDeep(element => element.getAttribute('aria-roledescription') === 'drag handle')
    const extensionHost = document.getElementById('shadow-root-live-chat')
    const switchButtonSlot = document.getElementById('switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec')
    const overlayContainer = findDeep(element => element.hasAttribute('data-ylc-overlay-container'))
    const extensionIframe = findDeep(element => element.matches?.('iframe[data-ylc-chat="true"]'))
    const extensionDomMounted = Boolean(extensionHost || switchButtonSlot || overlayContainer || extensionIframe)
    const extensionDomExpected = document.fullscreenElement !== null

    return {
      url: window.location.href,
      fullscreen: extensionDomExpected,
      extensionDomExpected,
      extensionDomMounted,
      extensionHostMounted: Boolean(extensionHost),
      switchButtonSlotMounted: Boolean(switchButtonSlot),
      overlayMounted: Boolean(overlayContainer),
      elements: {
        resizable: rectOf(resizable),
        frame: rectOf(frame),
        chatInner: rectOf(chatInner),
        controlRail: rectOf(controlRail),
        settingsButton: rectOf(settingsButton),
        dragHandle: rectOf(dragHandle),
        extensionIframe: rectOf(extensionIframe),
      },
    }
  })

  console.log(JSON.stringify(state, null, 2))
  if (state.extensionDomExpected && !state.extensionDomMounted) {
    console.error('')
    console.error('The page is fullscreen, but no YLC extension DOM was found.')
    console.error('Make sure the unpacked extension is loaded in this Chrome profile, then reload the YouTube page.')
    process.exitCode = 2
  }
} finally {
  await browser.close().catch(() => null)
}
