import { defineManifest } from '@crxjs/vite-plugin';

import { version } from '../package.json';

// NOTE: do not include src/ in paths,
// vite root folder: src, public folder: public (based on the project root)
// @see ../vite.config.ts#L16

const manifest = defineManifest(async (env) => ({
  manifest_version: 3,
  name: `${env.mode === 'development' ? '[Dev] ' : ''}Youtube Live Chat Fullscreen`,
  description: 'This extension allows Youtube Live to use chat when in Fullscreen.',
  version,
  web_accessible_resources: [
    {
      resources: [],
      matches: ['https://www.youtube.com/*'],
    },
  ],
  background: {
    service_worker: 'background/index.ts',
    matches: ['https://www.youtube.com/*'],
  },
  content_scripts: [
    {
      matches: ['https://www.youtube.com/*'],
      js: ['content/index.tsx'],
    },
  ],
  host_permissions: [],
  action: {
    matches: ['https://www.youtube.com/*'],
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
  permissions: ['tabs', 'storage'],
}));

export default manifest;
