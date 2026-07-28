import { createRoot } from 'react-dom/client'

import { CONTENT_SCRIPT_MATCHES } from '../../config/packagePolicy'
import { Content } from './Content'
import '@/shared/styles/react-colorful.css'
import './content.css'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'

export default defineContentScript({
  matches: CONTENT_SCRIPT_MATCHES,
  cssInjectionMode: 'ui',

  async main(ctx) {
    const runtime = await createAppRuntime()
    const ui = await createShadowRootUi(ctx, {
      name: 'wxt-react-content',
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount: container => {
        // Create a wrapper element
        const wrapper = document.createElement('div')
        wrapper.id = 'wxt-react-content'
        wrapper.dataset.ylcRoot = ''
        container.append(wrapper)

        const root = createRoot(wrapper)
        root.render(
          <AppProvider runtime={runtime}>
            <Content />
          </AppProvider>,
        )
        return { root, wrapper }
      },
      onRemove: elements => {
        elements?.root.unmount()
        elements?.wrapper.remove()
        runtime.dispose()
      },
    })

    ui.mount()
  },
})
