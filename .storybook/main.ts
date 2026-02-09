import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'
import Unocss from 'unocss/vite'
import { mergeConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
  async viteFinal(baseConfig) {
    return mergeConfig(baseConfig, {
      plugins: [tsconfigPaths(), Unocss()],
      resolve: {
        alias: {
          'redux-persist-webextension-storage': fileURLToPath(new URL('./mocks/reduxPersistStorage.ts', import.meta.url)),
        },
      },
    })
  },
}

export default config
