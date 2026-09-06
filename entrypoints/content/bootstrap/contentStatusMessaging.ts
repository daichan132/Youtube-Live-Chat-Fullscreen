import { browser } from 'wxt/browser'
import { isContentStatusRequest } from '@/shared/messaging/contentStatus'
import type { ContentBootstrap } from './ContentBootstrap'

export const registerContentStatusMessaging = (bootstrap: Pick<ContentBootstrap, 'getStatus' | 'retry'>) => {
  const listener: Parameters<typeof browser.runtime.onMessage.addListener>[0] = (message, sender) => {
    if (sender.id !== browser.runtime.id || sender.url !== browser.runtime.getURL('/popup.html') || !isContentStatusRequest(message)) return
    return Promise.resolve(message.type === 'ylc:status' ? bootstrap.getStatus() : bootstrap.retry(message.token))
  }
  browser.runtime.onMessage.addListener(listener)
  return () => browser.runtime.onMessage.removeListener(listener)
}
