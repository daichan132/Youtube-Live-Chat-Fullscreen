import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { patchCssModules } from 'vite-css-modules'
import webExtension, { readJsonFile } from 'vite-plugin-web-extension'
import tsconfigPaths from 'vite-tsconfig-paths'
import manifest from './src/manifest.json'

const target = process.env.TARGET || 'chrome'

function generateManifest() {
  const pkg = readJsonFile('package.json')
  return {
    version: pkg.version,
    ...manifest,
  }
}

export default defineConfig({
  define: { __BROWSER__: JSON.stringify(target) },
  plugins: [
    react(),
    webExtension({ manifest: generateManifest, browser: target }),
    tsconfigPaths(),
    patchCssModules({ generateSourceTypes: true }),
  ],
})
