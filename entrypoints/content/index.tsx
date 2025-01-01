import { createRoot } from 'react-dom/client'

import { Content } from './Content'
import '@/shared/i18n/config'
import 'uno.css'

export default defineContentScript({
  matches: ['*://www.youtube.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'wxt-react-content',
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount: container => {
        // Don't mount react app directly on <body>
        const wrapper = document.createElement('div')
        container.append(wrapper)

        const root = createRoot(wrapper)
        root.render(<Content />)
        return { root, wrapper }
      },
      onRemove: elements => {
        elements?.root.unmount()
        elements?.wrapper.remove()
      },
    })

    ui.mount()
  },
})
