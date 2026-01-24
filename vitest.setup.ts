import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

type MessageListener = (message: unknown) => void

const messageListeners = new Set<MessageListener>()

const onMessage = {
  addListener: vi.fn((listener: MessageListener) => {
    messageListeners.add(listener)
  }),
  removeListener: vi.fn((listener: MessageListener) => {
    messageListeners.delete(listener)
  }),
}

const runtime = {
  onMessage,
  __emitMessage: (message: unknown) => {
    messageListeners.forEach(listener => listener(message))
  },
  __listenerCount: () => messageListeners.size,
}

const chromeMock = {
  runtime,
} as unknown as typeof chrome

Object.defineProperty(globalThis, 'chrome', {
  value: chromeMock,
  writable: true,
})

beforeEach(() => {
  messageListeners.clear()
  onMessage.addListener.mockClear()
  onMessage.removeListener.mockClear()
})

afterEach(() => {
  cleanup()
})
