const noop = () => undefined

const chromeMock = {
  tabs: {
    query: (_queryInfo: unknown, callback?: (tabs: Array<{ id?: number }>) => void) => {
      callback?.([{ id: 1 }])
    },
    sendMessage: noop,
  },
  runtime: {
    onMessage: {
      addListener: noop,
      removeListener: noop,
    },
  },
  storage: {
    local: {
      get: (_keys: unknown, callback?: (items: Record<string, unknown>) => void) => {
        callback?.({})
      },
      set: (_items: Record<string, unknown>, callback?: () => void) => {
        callback?.()
      },
      remove: (_keys: unknown, callback?: () => void) => {
        callback?.()
      },
      clear: (callback?: () => void) => {
        callback?.()
      },
    },
  },
} as unknown as typeof chrome

export const ensureChromeMock = () => {
  if (typeof globalThis.chrome !== 'undefined') {
    return
  }

  Object.defineProperty(globalThis, 'chrome', {
    value: chromeMock,
    configurable: true,
    writable: true,
  })
}
