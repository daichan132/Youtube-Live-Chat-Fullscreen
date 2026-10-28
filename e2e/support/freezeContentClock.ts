import type { Page } from '@playwright/test'

/** Freeze only Date.now in the verified top-frame extension world; timers remain real. */
export const freezeContentClock = async (page: Page, extensionId: string, time: number) => {
  const cdp = await page.context().newCDPSession(page)
  const contexts = new Map<number, { id: number; origin: string; auxData?: { frameId?: string; isDefault?: boolean } }>()
  cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context))
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId))
  cdp.on('Runtime.executionContextsCleared', () => contexts.clear())
  try {
    const { frameTree } = await cdp.send('Page.getFrameTree')
    await cdp.send('Runtime.enable')
    const deadline = Date.now() + 10000
    let contextId: number | undefined
    while (contextId === undefined && Date.now() < deadline) {
      for (const context of contexts.values()) {
        if (context.origin !== `chrome-extension://${extensionId}` || context.auxData?.frameId !== frameTree.frame.id) continue
        try {
          const { result } = await cdp.send('Runtime.evaluate', {
            contextId: context.id,
            returnByValue: true,
            expression: `typeof chrome !== 'undefined' && chrome.runtime?.id === ${JSON.stringify(extensionId)}`,
          })
          if (result.value === true) {
            contextId = context.id
            break
          }
        } catch {
          // Navigation may retire a candidate world during the identity probe.
        }
      }
      if (contextId === undefined) await new Promise(resolve => setTimeout(resolve, 50))
    }
    if (contextId === undefined) throw new Error('The verified top-frame extension world is unavailable.')

    const evaluate = async (expression: string) => {
      const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', { contextId, returnByValue: true, expression })
      if (exceptionDetails) throw new Error('The extension clock operation failed.')
      return result.value
    }
    const installed = await evaluate(`(() => {
      if (chrome.runtime?.id !== ${JSON.stringify(extensionId)}) return false
      globalThis.__ylcOriginalDateNow = Date.now
      Date.now = () => ${JSON.stringify(time)}
      return Date.now() === ${JSON.stringify(time)}
    })()`)
    if (installed !== true) throw new Error('The extension clock was not fixed.')
    return {
      read: () => evaluate('Date.now()'),
      set: (nextTime: number) => evaluate(`Date.now = () => ${JSON.stringify(nextTime)}; Date.now()`),
      async dispose() {
        try {
          await evaluate('Date.now = globalThis.__ylcOriginalDateNow; delete globalThis.__ylcOriginalDateNow')
        } finally {
          await cdp.detach()
        }
      },
    }
  } catch (error) {
    await cdp.detach()
    throw error
  }
}
