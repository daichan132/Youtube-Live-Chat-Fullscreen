import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.tsx'],
  framework: '@storybook/react-vite',
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      optimizeDeps: { include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('../', import.meta.url)),
          'wxt/browser': fileURLToPath(new URL('./browser.ts', import.meta.url)),
        },
      },
    })
  },
}

export default config
