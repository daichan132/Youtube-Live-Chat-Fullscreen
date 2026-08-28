import { Provider } from 'jotai'
import { createContext, type ReactNode, useContext } from 'react'
import type { AppRuntime } from './createAppRuntime'

const AppRuntimeContext = createContext<AppRuntime | null>(null)

export const AppProvider = ({ runtime, children }: { runtime: AppRuntime; children: ReactNode }) => (
  <AppRuntimeContext.Provider value={runtime}>
    <Provider store={runtime.store}>{children}</Provider>
  </AppRuntimeContext.Provider>
)

export const useOptionalAppRuntime = () => useContext(AppRuntimeContext)

export const useAppRuntime = () => {
  const runtime = useOptionalAppRuntime()
  if (!runtime) throw new Error('AppRuntime is not available')
  return runtime
}
