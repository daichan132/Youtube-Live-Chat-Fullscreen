import type { Preview } from '@storybook/react-vite'
import i18n from '../shared/i18n/config'
import { ensureChromeMock } from './mocks/chrome'
import { ensureYouTubeDomScaffold } from './mocks/youtubeDom'
import '../entrypoints/popup/main.css'
import 'uno.css'
import { resetStorybookStores } from '../stories/utils/storybookState'

ensureChromeMock()

const preview: Preview = {
  globalTypes: {
    locale: {
      name: 'Locale',
      description: 'Display language',
      defaultValue: 'en',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'ja', title: '日本語' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: 'centered',
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f3f4f6' },
        { name: 'youtube-dark', value: '#0f0f0f' },
      ],
    },
    options: {
      storySort: {
        order: ['Catalog', 'Popup', 'Content', 'Shared'],
      },
    },
  },
  decorators: [
    (Story, context) => {
      resetStorybookStores()
      ensureYouTubeDomScaffold()
      void i18n.changeLanguage(context.globals.locale as string)
      return Story()
    },
  ],
}

export default preview
