import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    description: '__MSG_extensionDescription__',
    name: '__MSG_extensionName__',
    default_locale: 'en',
    browser_specific_settings: {
      gecko: { id: '{6fecd3d1-1743-4913-af18-f30d06d1fad6}' },
    },
    permissions: ['activeTab', 'storage'],
  },
})
