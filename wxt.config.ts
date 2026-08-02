import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

const e2eBridgePath = fileURLToPath(new URL('./e2e/assets/e2e.html', import.meta.url))

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
        resources: ['locales/*.json', 'settings.html'],
        matches: ['https://www.youtube.com/*'],
      },
    ],
  },
  hooks: {
    'build:publicAssets': (wxt, files) => {
      if (wxt.config.mode !== 'testing') return
      files.push({
        absoluteSrc: e2eBridgePath,
        relativeDest: 'e2e.html',
      })
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      target: 'esnext',
    },
  }),
})
