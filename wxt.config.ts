import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/unocss'],
  manifest: {
    description: '__MSG_extensionDescription__',
    name: '__MSG_extensionName__',
    default_locale: 'en',
    permissions: ['activeTab', 'storage'],
  },
})
