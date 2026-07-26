import { useSyncExternalStore } from 'react'
import { chatRuntime } from './ChatRuntime'

export const useChatRuntime = () => useSyncExternalStore(chatRuntime.subscribe, chatRuntime.getSnapshot, chatRuntime.getSnapshot)
