import { type ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './AppProvider'
import { createAppRuntime } from './createAppRuntime'

const renderStartupFailure = (rootElement: HTMLElement) => {
  rootElement.replaceChildren()
  const container = document.createElement('div')
  container.setAttribute('role', 'alert')
  container.style.cssText =
    'box-sizing:border-box;max-width:420px;margin:24px auto;padding:16px;border:1px solid #dc2626;border-radius:10px;font:14px/1.5 system-ui,sans-serif;color:#7f1d1d;background:#fef2f2'

  const message = document.createElement('p')
  message.textContent = 'The extension could not start.'
  message.style.margin = '0 0 12px'

  const retry = document.createElement('button')
  retry.type = 'button'
  retry.textContent = 'Reload'
  retry.style.cssText =
    'cursor:pointer;border:1px solid currentColor;border-radius:6px;padding:6px 10px;color:inherit;background:transparent;font:inherit;font-weight:600'
  retry.addEventListener('click', () => location.reload())

  container.append(message, retry)
  rootElement.append(container)
  return () => rootElement.replaceChildren()
}

export const mountExtensionPage = async (app: ReactNode, rootId = 'root') => {
  const rootElement = document.getElementById(rootId)
  if (!rootElement) throw new Error(`Extension page root #${rootId} was not found`)

  rootElement.setAttribute('aria-busy', 'true')
  let runtime: Awaited<ReturnType<typeof createAppRuntime>>
  try {
    runtime = await createAppRuntime()
  } catch {
    rootElement.removeAttribute('aria-busy')
    return renderStartupFailure(rootElement)
  }

  const root = createRoot(rootElement)
  let disposed = false

  const dispose = () => {
    if (disposed) return
    disposed = true
    window.removeEventListener('pagehide', dispose)
    root.unmount()
    runtime.dispose()
  }

  root.render(
    <StrictMode>
      <AppProvider runtime={runtime}>{app}</AppProvider>
    </StrictMode>,
  )
  rootElement.removeAttribute('aria-busy')
  window.addEventListener('pagehide', dispose, { once: true })

  return dispose
}
