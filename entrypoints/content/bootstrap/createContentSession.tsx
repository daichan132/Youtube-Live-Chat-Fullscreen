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
  const chatRuntime = new ChatRuntimeImpl({ portalHost: createPresentationLease(contentStyles) })
  try {
    const ui = await createShadowRootUi(ctx, {
      name: 'wxt-react-content',
      css: contentStyles.replaceAll(':root', ':host'),
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount: container => {
        container.id = 'wxt-react-content'
        container.dataset.ylcRoot = ''

        const root = createRoot(container)
        root.render(
          <AppProvider runtime={runtime}>
            <ChatRuntimeProvider runtime={chatRuntime}>
              <Content />
            </ChatRuntimeProvider>
          </AppProvider>,
        )
        return root
      },
      onRemove: root => {
        root?.unmount()
        chatRuntime.stop()
        runtime.dispose()
      },
    })

    ui.mount()
    let disposed = false
    return {
      getDiagnosticReport: chatRuntime.getDiagnosticReport,
      restart: () => chatRuntime.restart(),
      dispose() {
        if (disposed) return
        disposed = true
        ui.remove()
      },
    }
  } catch (error) {
    chatRuntime.stop()
    runtime.dispose()
    throw error
  }
}
