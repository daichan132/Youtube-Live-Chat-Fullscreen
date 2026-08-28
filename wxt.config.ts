import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type TargetBrowser, type UserManifest } from 'wxt'
import { EXTENSION_PERMISSIONS, WEB_ACCESSIBLE_RESOURCE_MATCHES, WEB_ACCESSIBLE_RESOURCES } from './config/packagePolicy'

const e2eDirectory = fileURLToPath(new URL('./e2e', import.meta.url))
const e2eBridgePath = fileURLToPath(new URL('./e2e/assets/e2e.html', import.meta.url))

export const FIREFOX_SOURCE_INCLUDE = [
  '.yarn/releases/yarn-4.18.0.cjs',
  '.yarnrc.yml',
  'LICENSE',
  'README.md',
  'SOURCE_CODE_REVIEW.md',
  'config/**',
  'entrypoints/**',
  'mise.toml',
  'package.json',
  'public/**',
  'shared/**',
  'tsconfig.json',
  'wxt.config.ts',
  'yarn.lock',
] as const

export const createExtensionManifest = (browser: TargetBrowser): UserManifest => ({
  description: '__MSG_extensionDescription__',
  name: '__MSG_extensionName__',
  default_locale: 'en',
  permissions: [...EXTENSION_PERMISSIONS],
  web_accessible_resources: [
    {
      resources: [...WEB_ACCESSIBLE_RESOURCES],
      matches: [...WEB_ACCESSIBLE_RESOURCE_MATCHES],
    },
  ],
  ...(browser === 'firefox'
    ? {
        browser_specific_settings: {
          gecko: {
            id: '{6fecd3d1-1743-4913-af18-f30d06d1fad6}',
            data_collection_permissions: {
              required: ['none'],
            },
          },
        },
      }
    : {}),
})

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  alias: {
    '@e2e': e2eDirectory,
  },
  manifest: ({ browser }) => createExtensionManifest(browser),
  zip: {
    dotSources: true,
    includeSources: [...FIREFOX_SOURCE_INCLUDE],
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
  }),
})
