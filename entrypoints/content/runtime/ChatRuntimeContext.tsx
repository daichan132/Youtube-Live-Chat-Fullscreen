import { createContext, type ReactNode, useContext, useSyncExternalStore } from 'react'
import type { ChatRuntime } from './ChatRuntime'

const ChatRuntimeContext = createContext<ChatRuntime | null>(null)

export const ChatRuntimeProvider = ({ runtime, children }: { runtime: ChatRuntime; children: ReactNode }) => (
  <ChatRuntimeContext.Provider value={runtime}>{children}</ChatRuntimeContext.Provider>
)

export const useChatRuntimeInstance = () => {
  const runtime = useContext(ChatRuntimeContext)
  if (!runtime) throw new Error('ChatRuntime is not available')
  return runtime
}

export const useChatRuntime = () => {
  const runtime = useChatRuntimeInstance()
  return useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
}
