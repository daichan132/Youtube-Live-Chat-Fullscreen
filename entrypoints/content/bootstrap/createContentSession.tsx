import { createRoot } from 'react-dom/client'
import type { ContentScriptContext } from 'wxt/utils/content-script-context'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { Content } from '../Content'
import { ChatRuntimeImpl } from '../runtime/ChatRuntime'
import { ChatRuntimeProvider } from '../runtime/ChatRuntimeContext'
import type { ContentSession } from './ContentBootstrap'

export const createContentSession = async (ctx: ContentScriptContext): Promise<ContentSession> => {
  const runtime = await createAppRuntime()
  const chatRuntime = new ChatRuntimeImpl()
  try {
    const ui = await createShadowRootUi(ctx, {
      name: 'wxt-react-content',
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
