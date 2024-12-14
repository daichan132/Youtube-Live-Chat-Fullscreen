import react from '@vitejs/plugin-react'
import { createLogger, defineConfig } from 'vite'
import { patchCssModules } from 'vite-css-modules'
import webExtension, { readJsonFile } from 'vite-plugin-web-extension'
import tsconfigPaths from 'vite-tsconfig-paths'
import manifest from './src/manifest.json'

const target = process.env.TARGET || 'chrome'
const logger = createLogger('info', { prefix: '[YouTube Live Chat Fullscreen]' })

function generateManifest() {
  const pkg = readJsonFile('package.json')
  return {
    version: pkg.version,
    ...manifest,
  }
}

export default defineConfig({
  customLogger: logger,
  define: { __BROWSER__: JSON.stringify(target) },
  plugins: [
    react(),
    webExtension({
      manifest: generateManifest,
      browser: target,
      webExtConfig: { startUrl: 'https://www.youtube.com/results?search_query=vtuber' },
    }),
    tsconfigPaths(),
    patchCssModules({ generateSourceTypes: true }),
  ],
})
