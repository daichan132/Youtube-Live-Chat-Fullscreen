import { defineManifest } from '@crxjs/vite-plugin'

import { version } from '../package.json'

const manifest = defineManifest(async env => ({
  manifest_version: 3,
  name: env.mode === 'development' ? '__MSG_extensionNameDev__' : '__MSG_extensionName__',
  description: '__MSG_extensionDescription__',
  version,
  default_locale: 'en',
  background: {
    service_worker: 'background/index.ts',
  },
  content_scripts: [
    {
      matches: ['https://www.youtube.com/*'],
      js: ['content/index.tsx'],
    },
  ],
  host_permissions: [],
  action: {
    default_popup: 'popup/popup.html',
    default_icon: {
      '16': 'images/extension_16.png',
      '32': 'images/extension_32.png',
      '48': 'images/extension_48.png',
      '128': 'images/extension_128.png',
    },
  },
  icons: {
    '16': 'images/extension_16.png',
    '32': 'images/extension_32.png',
    '48': 'images/extension_48.png',
    '128': 'images/extension_128.png',
  },
  commands: {
    'toggle-chat-fullscreen': {
      suggested_key: {
        default: 'Ctrl+Shift+Y',
        mac: 'Command+Shift+Y',
      },
      description: 'Toggle Show Chat on Fullscreen',
    },
  },
  permissions: ['activeTab', 'storage'],
}))

export default manifest
