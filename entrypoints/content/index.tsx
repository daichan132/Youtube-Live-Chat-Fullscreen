import { createRoot } from 'react-dom/client'

import { CONTENT_SCRIPT_MATCHES } from '../../config/packagePolicy'
import { Content } from './Content'
import '@/shared/styles/react-colorful.css'
import './content.css'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { ChatRuntimeImpl } from './runtime/ChatRuntime'
import { ChatRuntimeProvider } from './runtime/ChatRuntimeContext'

export default defineContentScript({
  matches: CONTENT_SCRIPT_MATCHES,
  cssInjectionMode: 'ui',

  async main(ctx) {
    const runtime = await createAppRuntime()
    const chatRuntime = new ChatRuntimeImpl()
    const ui = await createShadowRootUi(ctx, {
      name: 'wxt-react-content',
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount: container => {
        const wrapper = document.createElement('div')
        wrapper.id = 'wxt-react-content'
        wrapper.dataset.ylcRoot = ''
        container.append(wrapper)

        const root = createRoot(wrapper)
        root.render(
          <AppProvider runtime={runtime}>
            <ChatRuntimeProvider runtime={chatRuntime}>
              <Content />
            </ChatRuntimeProvider>
          </AppProvider>,
        )
        return { root, wrapper }
      },
      onRemove: elements => {
        elements?.root.unmount()
        elements?.wrapper.remove()
        chatRuntime.stop()
        runtime.dispose()
      },
    })

    ui.mount()
  },
})
