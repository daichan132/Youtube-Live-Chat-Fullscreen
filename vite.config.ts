import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { patchCssModules } from 'vite-css-modules'
import tsconfigPaths from 'vite-tsconfig-paths'
import manifest from './src/manifest'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
  // prevent src/ prefix on extension urls
  root: path.resolve(__dirname, 'src'),
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    rollupOptions: {
      // input: {
      //   // see web_accessible_resources in the manifest config
      //   welcome: path.join(__dirname, 'src/welcome/welcome.html'),
      // },
      output: {
        chunkFileNames: 'assets/chunk-[hash].js',
      },
    },
  },
  plugins: [
    react(),
    crx({ manifest }),
    tsconfigPaths(),
    patchCssModules({
      generateSourceTypes: true,
    }),
  ],
})
