import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { ChatCssExample } from '@/entrypoints/content/features/YTDLiveChatSetting/components/ChatCssExample'
import { useLocaleDirection, useT } from '@/shared/i18n/react'
import { CHAT_CSS_PRESETS } from '@/shared/settings/chatCssPresets'
import { storyLocale, storyText, storyTheme } from './customCssStoryRuntime'
import { SettingsStoryHarness } from './SettingsStoryHarness'
import '@/entrypoints/content/features/YTDLiveChatSetting/components/customCssSection.css'

const layoutIds = ['messenger', 'stage', 'timeline']
const ChatLayoutsComparison = () => {
  const t = useT()
  const direction = useLocaleDirection()
  return (
    <section dir={direction} style={{ maxWidth: 1200, margin: '32px auto', color: 'var(--ylc-text-primary)' }}>
      <h1 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: 24 }}>{t('content.customCss.presetGalleryTitle')}</h1>
      <p style={{ margin: '0 0 24px', color: '#d1d8e3', fontSize: 14, lineHeight: 1.7 }}>
        {t('content.customCss.presetGalleryDescription')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
        {layoutIds.map(id => {
          const preset = CHAT_CSS_PRESETS.find(item => item.id === id)
          if (!preset) throw new Error(`Missing chat layout: ${id}`)
          return (
            <article
              key={id}
              data-chat-layout={id}
              style={{ padding: 16, minWidth: 0, borderRadius: 16, background: 'var(--ylc-bg-surface)' }}
            >
              <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>{t(preset.labelKey)}</h2>
              <ChatCssExample preset={preset} />
            </article>
          )
        })}
      </div>
    </section>
  )
}

const meta = {
  title: '設定/おすすめCSS',
  component: ChatLayoutsComparison,
  parameters: { layout: 'fullscreen' },
  render: (_, context) => (
    <SettingsStoryHarness
      seed='initial'
      saveDelayMs={0}
      failureMode='none'
      locale={storyLocale(context.globals.locale)}
      theme={storyTheme(context.globals.theme)}
      description='組み込みCSSの固定の見た目の例です。実チャットへの適用は「カスタムCSS」タブで確認できます。'
    >
      <ChatLayoutsComparison />
    </SettingsStoryHarness>
  ),
} satisfies Meta<typeof ChatLayoutsComparison>
export default meta
type Story = StoryObj<typeof meta>

export const Comparison: Story = {
  name: '吹き出し・カード・タイムラインを比較',
  play: async context => {
    const ui = within(context.canvasElement)
    for (const id of layoutIds) {
      const preset = CHAT_CSS_PRESETS.find(item => item.id === id)
      if (!preset) throw new Error(`Missing chat layout: ${id}`)
      await expect(ui.getByRole('heading', { name: storyText(storyLocale(context.globals.locale), preset.labelKey) })).toBeVisible()
      const example = context.canvasElement.querySelector(`[data-ylc-css-example="${id}"]`)
      await expect(example).toBeVisible()
      await expect(example?.querySelectorAll('.ylc-css-example-message')).toHaveLength(3)
    }
    await expect(context.canvasElement.querySelector('style, iframe, script')).toBeNull()
  },
}
