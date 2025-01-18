import { defineConfig, presetAttributify, presetIcons, presetUno } from 'unocss'
import { presetScrollbar } from 'unocss-preset-scrollbar'

export default defineConfig({
  presets: [presetUno(), presetAttributify(), presetIcons(), presetScrollbar()],
})
