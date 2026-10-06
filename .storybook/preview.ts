import type { Preview } from '@storybook/react-vite'
import './preview.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'テーマ',
      toolbar: {
        icon: 'paintbrush',
        title: 'テーマ',
        dynamicTitle: true,
        items: [
          { value: 'light', title: 'ライト' },
          { value: 'dark', title: 'ダーク' },
          { value: 'system', title: 'システム' },
        ],
      },
    },
    locale: {
      description: '表示言語',
      toolbar: {
        icon: 'globe',
        title: '言語',
        dynamicTitle: true,
        items: [
          { value: 'ja', title: '日本語' },
          { value: 'en', title: 'English' },
          { value: 'ar', title: 'العربية / RTL' },
        ],
      },
    },
  },
  initialGlobals: { theme: 'dark', locale: 'ja' },
  parameters: {
    layout: 'fullscreen',
    docs: { story: { inline: false } },
    viewport: {
      options: {
        desktop: { name: 'デスクトップ', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
        mobile360: { name: '狭い画面 / 360px', styles: { width: '360px', height: '640px' }, type: 'mobile' },
        mobile320: { name: '狭い画面 / 320px', styles: { width: '320px', height: '640px' }, type: 'mobile' },
      },
    },
  },
}

export default preview
