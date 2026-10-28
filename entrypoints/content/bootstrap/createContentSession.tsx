import { createRoot } from 'react-dom/client'
import type { ContentScriptContext } from 'wxt/utils/content-script-context'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { loadContentStyles } from '@/shared/runtime/extensionAssets'
import { Content } from '../Content'
import { ChatRuntimeImpl } from '../runtime/ChatRuntime'
import { ChatRuntimeProvider } from '../runtime/ChatRuntimeContext'
import { createPresentationLease } from '../runtime/resources/PresentationLease'
import type { ContentSession } from './ContentBootstrap'

export const createContentSession = async (ctx: ContentScriptContext): Promise<ContentSession> => {
  const contentStyles = await loadContentStyles()
  const runtime = await createAppRuntime()
  let chatRuntime: ChatRuntimeImpl | null = null
  let root: ReturnType<typeof createRoot> | null = null
  let ui: Awaited<ReturnType<typeof createShadowRootUi>> | null = null
  let cleaned = false
  let cleanupFailed = false
  let cleanupError: unknown
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    for (const release of [() => root?.unmount(), () => chatRuntime?.stop(), () => runtime.dispose()]) {
      try {
        release()
      } catch (error) {
        if (!cleanupFailed) cleanupError = error
        cleanupFailed = true
      }
    }
    root = null
  }
  try {
    const activeChatRuntime = new ChatRuntimeImpl({ portalHost: createPresentationLease(contentStyles) })
    chatRuntime = activeChatRuntime
    ui = await createShadowRootUi(ctx, {
      name: 'wxt-react-content',
      css: contentStyles.replaceAll(':root', ':host'),
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount: container => {
        container.id = 'wxt-react-content'
        container.dataset.ylcRoot = ''

        root = createRoot(container)
        root.render(
          <AppProvider runtime={runtime}>
            <ChatRuntimeProvider runtime={activeChatRuntime}>
              <Content />
            </ChatRuntimeProvider>
          </AppProvider>,
        )
        return root
      },
      onRemove: cleanup,
    })

    const mountedUi = ui
    mountedUi.mount()
    let disposed = false
    return {
      getDiagnosticReport: activeChatRuntime.getDiagnosticReport,
      restart: () => activeChatRuntime.restart(),
      dispose() {
        if (disposed) return
        disposed = true
        try {
          mountedUi.remove()
        } finally {
          cleanup()
        }
        if (cleanupFailed) throw cleanupError
      },
    }
  } catch (error) {
    // WXT inserts the host before onMount completes. Its remove path calls
    // onRemove before removing the host and document styles.
    try {
      ui?.remove()
    } catch {
      // Preserve the startup failure while attempting the remaining owners.
      try {
        ui?.shadowHost.remove()
      } catch {
        // The page may already have destroyed the host.
      }
    }
    cleanup()
    throw error
  }
}
