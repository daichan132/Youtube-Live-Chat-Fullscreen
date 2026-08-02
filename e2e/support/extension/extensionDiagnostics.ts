import { switchButtonContainerSelector, switchButtonSelector } from '@e2e/utils/selectors'
import type { Page, TestInfo } from '@playwright/test'

export type BrowserLogBuffer = {
  console: string[]
  pageErrors: string[]
}

export const observeBrowserLogs = (page: Page) => {
  const buffer: BrowserLogBuffer = { console: [], pageErrors: [] }
  const onConsole = (message: { type(): string; text(): string }) => {
    buffer.console.push(`[${message.type()}] ${message.text()}`)
  }
  const onPageError = (error: Error) => {
    buffer.pageErrors.push(error.stack ?? error.message)
  }
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  return {
    buffer,
    dispose() {
      page.off('console', onConsole)
      page.off('pageerror', onPageError)
    },
  }
}

const readExtensionDiagnostics = (selectors: { switchContainer: string; switchButton: string }) => {
  const helpers = window.__ylcHelpers
  const nativeIframe = helpers.getNativeIframe()
  const extensionIframe = helpers.getExtensionIframe()
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  return {
    fullscreen: document.fullscreenElement !== null,
    runtime: {
      fullscreen: document.fullscreenElement !== null,
      layoutClass: document.documentElement.classList.contains('ylc-fullscreen-chat-fix'),
      layoutStyle: document.getElementById('ylc-fullscreen-chat-layout-fix') !== null,
    },
    portals: {
      shadowHost: Boolean(host),
      shadowRoot: Boolean(root),
      overlayContainers: root?.querySelectorAll('[data-ylc-overlay-container]').length ?? 0,
      switchContainers: document.querySelectorAll(selectors.switchContainer).length,
      switchButtons: document.querySelectorAll(selectors.switchButton).length,
    },
    nativeIframe: nativeIframe
      ? {
          id: nativeIframe.id,
          documentReady: Boolean(helpers.readIframeHref(nativeIframe)),
          connected: nativeIframe.isConnected,
          unavailable: helpers.isDocUnavailable(nativeIframe.contentDocument),
        }
      : null,
    extensionIframe: extensionIframe
      ? {
          id: extensionIframe.id,
          documentReady: Boolean(helpers.readIframeHref(extensionIframe)),
          owned: extensionIframe.getAttribute('data-ylc-owned'),
          source: extensionIframe.getAttribute('data-ylc-source'),
          connected: extensionIframe.isConnected,
          unavailable: helpers.isDocUnavailable(extensionIframe.contentDocument),
        }
      : null,
  }
}

export const attachFailureDiagnostics = async (page: Page, testInfo: TestInfo, logs: BrowserLogBuffer) => {
  if (testInfo.status === testInfo.expectedStatus) return
  const pageState = await page
    .evaluate(readExtensionDiagnostics, {
      switchContainer: switchButtonContainerSelector,
      switchButton: switchButtonSelector,
    })
    .catch(error => ({
      captureError: error instanceof Error ? error.message : String(error),
    }))
  await testInfo.attach('extension-diagnostics', {
    body: JSON.stringify(
      {
        page: pageState,
        logs: {
          consoleCount: logs.console.length,
          pageErrorCount: logs.pageErrors.length,
        },
      },
      null,
      2,
    ),
    contentType: 'application/json',
  })
}
