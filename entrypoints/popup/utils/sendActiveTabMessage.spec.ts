import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendActiveTabMessage } from './sendActiveTabMessage'

const query = vi.fn()
const sendMessage = vi.fn()

const installChromeTabsMock = () => {
  globalThis.chrome = {
    ...globalThis.chrome,
    runtime: {
      ...globalThis.chrome.runtime,
      lastError: undefined,
    },
    tabs: {
      query,
      sendMessage,
    },
  } as unknown as typeof chrome
}

describe('sendActiveTabMessage', () => {
  beforeEach(() => {
    query.mockReset()
    sendMessage.mockReset()
    installChromeTabsMock()
  })

  it('sends a message to the active current-window tab', () => {
    query.mockImplementation((_queryInfo, callback: (tabs: Array<{ id?: number }>) => void) => {
      callback([{ id: 123 }])
    })

    const payload = { message: 'themeMode', themeMode: 'dark' }
    sendActiveTabMessage(payload)

    expect(query).toHaveBeenCalledWith({ active: true, currentWindow: true }, expect.any(Function))
    expect(sendMessage).toHaveBeenCalledWith(123, payload, expect.any(Function))
  })

  it.each([undefined, 0])('skips sendMessage when the active tab id is %s', tabId => {
    query.mockImplementation((_queryInfo, callback: (tabs: Array<{ id?: number }>) => void) => {
      callback([{ id: tabId }])
    })

    sendActiveTabMessage({ message: 'language', language: 'ja' })

    expect(sendMessage).not.toHaveBeenCalled()
  })
})
