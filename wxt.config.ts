import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    description: '__MSG_extensionDescription__',
    name: '__MSG_extensionName__',
    default_locale: 'en',
    permissions: ['activeTab', 'storage'],
    web_accessible_resources: [
      {
        resources: ['locales/*.json'],
        matches: ['https://www.youtube.com/*'],
      },
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      target: 'esnext',
    },
  }),
})
