type PersistStorage = {
  getItem: (name: string) => string | null
  setItem: (name: string, value: string) => void
  removeItem: (name: string) => void
}

const fallbackStorage = new Map<string, string>()

const memoryStorage: PersistStorage = {
  getItem: name => fallbackStorage.get(name) ?? null,
  setItem: (name, value) => {
    fallbackStorage.set(name, value)
  },
  removeItem: name => {
    fallbackStorage.delete(name)
  },
}

export const localStorage: PersistStorage =
  typeof globalThis.localStorage === 'undefined' ? memoryStorage : globalThis.localStorage
