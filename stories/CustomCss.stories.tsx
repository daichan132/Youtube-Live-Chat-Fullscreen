import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test'
import { CHAT_CSS_PRESETS } from '@/shared/settings/chatCssPresets'
import { EDITED_CSS, storyLocale, storyText, storyTheme } from './customCssStoryRuntime'
import { SettingsStoryHarness } from './SettingsStoryHarness'

const meta = {
  title: '設定/カスタムCSS',
  component: SettingsStoryHarness,
  parameters: {
    layout: 'fullscreen',
    docs: { story: { inline: false } },
  },
  args: { seed: 'initial', saveDelayMs: 450, failureMode: 'none', locale: 'ja', theme: 'dark', description: '' },
  argTypes: {
    seed: { table: { disable: true } },
    locale: { table: { disable: true } },
    theme: { table: { disable: true } },
    description: { table: { disable: true } },
    saveDelayMs: { name: '保存待ち時間 (ms)', control: { type: 'range', min: 0, max: 2500, step: 50 } },
    failureMode: {
      name: '次の保存を1回失敗させる',
      options: ['none', 'customCss', 'savedChatCss', 'customCssSuspended'],
      control: { type: 'select' },
    },
  },
  render: (args, context) => (
    <SettingsStoryHarness
      key={context.id}
      {...args}
      locale={storyLocale(context.globals.locale)}
      theme={storyTheme(context.globals.theme)}
      description={context.parameters.docs?.description?.story ?? ''}
    />
  ),
} satisfies Meta<typeof SettingsStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
type PlayContext = { canvasElement: HTMLElement; globals: Record<string, unknown> }
const uiFor = (context: PlayContext) => within(context.canvasElement.ownerDocument.body)
const textFor = (context: PlayContext) => (key: Parameters<typeof storyText>[1]) => storyText(storyLocale(context.globals.locale), key)
const openCss = async (context: PlayContext) => {
  const ui = uiFor(context)
  const text = textFor(context)
  const tab = await ui.findByRole('tab', { name: text('content.customCss.title') })
  await userEvent.click(tab)
  await expect(tab).toHaveAttribute('aria-selected', 'true')
  return ui
}
const choosePreset = async (context: PlayContext, id: string) => {
  const ui = uiFor(context)
  const text = textFor(context)
  const preset = CHAT_CSS_PRESETS.find(item => item.id === id)
  if (!preset) throw new Error(`Missing chat layout: ${id}`)
  const chooser = ui.getByRole('button', { name: text('content.customCss.choosePreset') })
  await waitFor(() => expect(chooser).toBeEnabled(), { timeout: 5000 })
  await userEvent.click(chooser)
  await expect(chooser).toHaveAttribute('aria-expanded', 'true')
  await userEvent.click(ui.getByRole('button', { name: text('content.customCss.loadPreset').replace('{name}', text(preset.labelKey)) }))
  return preset
}
const openLibrary = async (context: PlayContext) => {
  const library = context.canvasElement.ownerDocument.querySelector<HTMLDetailsElement>('.ylc-custom-css-library')
  if (!library) throw new Error('Missing saved CSS library')
  const summary = library.querySelector('summary')
  if (!summary) throw new Error('Missing saved CSS library summary')
  if (!library.open) await userEvent.click(summary)
  await expect(library).toHaveAttribute('open')
}
const openEditor = async (context: PlayContext) => {
  const ui = await openCss(context)
  return ui.findByRole('textbox', { name: 'CSS' })
}
const editCss = async (context: PlayContext) => {
  const editor = await openEditor(context)
  await userEvent.clear(editor)
  await userEvent.type(editor, EDITED_CSS.replaceAll('{', '{{'), { delay: null })
  await expect(editor).toHaveValue(EDITED_CSS)
  return editor
}
const description = (story: string) => ({ docs: { description: { story } } })

export const Initial: Story = {
  name: '初期・CSSを貼り付ける',
  parameters: description('初めてカスタムCSSタブを開いた状態。入力欄は常に表示され、貼り付けたCSSを使用・名前付き保存できます。'),
  play: async context => {
    const ui = await openCss(context)
    await expect(ui.getByRole('button', { name: textFor(context)('content.customCss.choosePreset') })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    await expect(context.canvasElement.ownerDocument.querySelector('[data-ylc-css-preset-choice]')).toBeNull()
    await expect(ui.getByRole('button', { name: textFor(context)('content.customCss.apply') })).toBeDisabled()
    await expect(ui.getByRole('textbox', { name: 'CSS' })).toHaveValue('')
  },
}

export const SavedStyles: Story = {
  name: '保存済み・個人のスタイル一覧',
  args: { seed: 'saved' },
  parameters: description('名前を付けたCSSが複数ある状態。保存済みの「動画向けの白文字」を選びます。選択だけでは使用されません。'),
  play: async context => {
    const ui = await openCss(context)
    await openLibrary(context)
    await userEvent.click(
      ui.getByRole('button', { name: textFor(context)('content.customCss.loadSaved').replace('{name}', '動画向けの白文字') }),
    )
    await expect(ui.getByRole('textbox', { name: 'CSS' })).not.toHaveValue('')
    await expect(
      ui.getByRole('button', { name: textFor(context)('content.customCss.useSavedLabel').replace('{name}', '動画向けの白文字') }),
    ).toBeEnabled()
  },
}

export const Editing: Story = {
  name: '編集中・CSSの貼り付けと変更',
  args: { seed: 'saved' },
  parameters: description('常設の入力欄にCSSを貼り付けた状態。使用・名前付き保存・保存済みスタイルの読み込みを操作できます。'),
  play: async context => {
    await editCss(context)
  },
}

export const Paused: Story = {
  name: '停止中・同じスタイルで再開',
  args: { seed: 'active' },
  parameters: description('使用中の吹き出しCSSを「オフにする」で停止した状態。本文を残して、選択中のスタイルで再開できます。'),
  play: async context => {
    const ui = await openCss(context)
    const text = textFor(context)
    await userEvent.click(ui.getByRole('button', { name: text('content.customCss.disable') }))
    await expect(await ui.findByRole('button', { name: text('content.customCss.resume') }, { timeout: 5000 })).toBeEnabled()
    await expect(ui.getByText(text('content.customCss.inactive'), { selector: '[role="status"]', exact: true })).toBeVisible()
  },
}

export const NamedCopy: Story = {
  name: '名前付き保存・登録フォーム',
  parameters: description('カードのスタイルを読み込み、「保存」を開いた状態。一覧へ保存しても使用中のCSSは変わりません。'),
  play: async context => {
    const ui = await openCss(context)
    const text = textFor(context)
    await choosePreset(context, 'cards')
    await openEditor(context)
    await userEvent.click(ui.getByRole('button', { name: text('content.customCss.register') }))
    const name = await ui.findByRole('textbox', { name: text('content.customCss.name') })
    await expect(name).toHaveFocus()
    await expect(name).toHaveValue(text('content.customCss.presetCards'))
  },
}

export const SaveFailure: Story = {
  name: '保存失敗・本文を保持して再試行',
  args: { failureMode: 'customCss' },
  parameters: description('CSSを編集して使用し、保存が失敗した状態。入力は保持されます。「再試行」で同じ保存内容を確定できます。'),
  play: async context => {
    const editor = await editCss(context)
    const ui = uiFor(context)
    await userEvent.click(ui.getByRole('button', { name: textFor(context)('content.customCss.apply') }))
    await expect(await ui.findByText(textFor(context)('content.customCss.saveFailed'), { exact: true }, { timeout: 5000 })).toBeVisible()
    await expect(editor).toHaveValue(EDITED_CSS)
  },
}

export const ReplaceDraftConfirmation: Story = {
  name: '確認・未保存の編集を置き換える',
  parameters: description('CSSを編集した後、別のおすすめスタイルを選んだ状態。キャンセルすると編集した本文を保持します。'),
  play: async context => {
    const ui = uiFor(context)
    const text = textFor(context)
    await editCss(context)
    await choosePreset(context, 'cards')
    await expect(await ui.findByRole('group', { name: text('content.customCss.confirmTitle') })).toBeVisible()
    await expect(ui.getByText(text('content.customCss.replaceDraft'), { exact: true })).toBeVisible()
  },
}

export const CloseConfirmation: Story = {
  name: '確認・未保存のCSSを残して戻る',
  parameters: description('CSSを編集後、設定画面の×を押した状態。「編集に戻る」と下書きを破棄して閉じる操作を確認できます。'),
  play: async context => {
    const ui = uiFor(context)
    const text = textFor(context)
    await editCss(context)
    await userEvent.click(ui.getByRole('button', { name: text('content.aria.close') }))
    await expect(await ui.findByRole('group', { name: text('content.customCss.confirmTitle') })).toBeVisible()
    await expect(ui.getByText(text('content.customCss.discardOnClose'), { exact: true })).toBeVisible()
  },
}

export const NarrowSelection: Story = {
  name: '狭画面・360pxのスタイル選択',
  globals: { viewport: { value: 'mobile360', isRotated: false } },
  args: { seed: 'saved' },
  parameters: description('360px幅の画面でカスタムCSSを選択する状態。Viewportツールで320px幅とも比較できます。'),
  play: async context => {
    await openCss(context)
    await openLibrary(context)
  },
}

export const NarrowEditing: Story = {
  name: '狭画面・320pxのCSS編集',
  globals: { viewport: { value: 'mobile320', isRotated: false } },
  parameters: description('320px幅の画面でCSSを編集する状態。名前付き保存や確認画面も同じ画面幅で操作できます。'),
  play: async context => {
    await editCss(context)
  },
}

export const LibraryRoundTrip: Story = {
  name: '保存→再表示→使う',
  parameters: description(
    '貼り付けたCSSを名前付きで保存し、画面を閉じてから再表示し、一覧から使用した状態。保存した本文を後から再利用できます。',
  ),
  play: async context => {
    const ui = uiFor(context)
    const text = textFor(context)
    const name = '配信用の紫ライン'
    await editCss(context)
    await userEvent.click(ui.getByRole('button', { name: text('content.customCss.register') }))
    await userEvent.type(ui.getByRole('textbox', { name: text('content.customCss.name') }), name, { delay: null })
    await userEvent.click(ui.getByRole('button', { name: text('content.customCss.saveRegistration') }))
    await expect(await ui.findByText(text('content.customCss.registered'), { exact: true }, { timeout: 5000 })).toBeVisible()
    await userEvent.click(ui.getByRole('button', { name: text('content.aria.close') }))
    await userEvent.click(ui.getByRole('button', { name: text('content.customCss.discardAndClose') }))
    await userEvent.click(ui.getByRole('button', { name: text('content.aria.openSettings') }))
    await openCss(context)
    await openLibrary(context)
    await userEvent.click(ui.getByRole('button', { name: text('content.customCss.useSavedLabel').replace('{name}', name) }))
    await expect(
      await ui.findByText(text('content.customCss.active'), { selector: '[role="status"]', exact: true }, { timeout: 5000 }),
    ).toBeVisible()
    await expect(ui.getByRole('textbox', { name: 'CSS' })).toHaveValue(EDITED_CSS)
  },
}

export const ChatLayouts: Story = {
  name: 'おすすめ・チャットの配置を変える',
  parameters: description(
    'メッセンジャー、名前ヘッダー付きカード、タイムラインを順に読み込んで使用できます。文字だけでなく名前・本文・アバターの配置が変わるおすすめです。',
  ),
  play: async context => {
    const ui = await openCss(context)
    const text = textFor(context)
    for (const id of ['messenger', 'stage', 'timeline']) {
      const preset = await choosePreset(context, id)
      await expect(ui.getByRole('textbox', { name: 'CSS' })).toHaveValue(preset.css)
      const preview = context.canvasElement.ownerDocument.querySelector(`iframe[data-ylc-css-preview="${id}"]`)
      await expect(preview).toBeVisible()
      await expect(preview).toHaveAttribute('sandbox', '')
      await expect(preview?.getAttribute('srcdoc')).toContain(preset.css)
      await userEvent.click(ui.getByRole('button', { name: text('content.customCss.apply') }))
      await waitFor(() => expect(ui.getByRole('button', { name: text('content.customCss.active') })).toBeDisabled(), { timeout: 5000 })
      await expect(
        await ui.findByText(text('content.customCss.active'), { selector: '[role="status"]', exact: true }, { timeout: 5000 }),
      ).toBeVisible()
    }
  },
}

export const PresetPreview: Story = {
  name: 'プレビュー・選んだCSSを設定で調整',
  args: { saveDelayMs: 0 },
  parameters: description(
    'おすすめからメッセンジャー風を選び、使用後に「色・文字サイズを調整」から文字サイズを変更します。CSS本文はそのまま、プレビューへ設定が反映されます。',
  ),
  play: async context => {
    const ui = await openCss(context)
    const text = textFor(context)
    const preset = await choosePreset(context, 'messenger')
    await expect(ui.getByRole('textbox', { name: 'CSS' })).toHaveValue(preset.css)
    await expect(context.canvasElement.ownerDocument.querySelector('iframe[data-ylc-css-preview="messenger"]')).toBeVisible()
    await userEvent.click(ui.getByRole('button', { name: text('content.customCss.apply') }))
    await expect(await ui.findByText(text('content.customCss.active'), { selector: '[role="status"]', exact: true })).toBeVisible()
    await userEvent.click(ui.getByRole('button', { name: text('content.customCss.adjustAppearance') }))
    await expect(ui.getByRole('tab', { name: text('content.setting.header.setting') })).toHaveAttribute('aria-selected', 'true')
    const size = ui.getByRole('slider', { name: text('content.setting.fontSize') })
    fireEvent.change(size, { target: { value: '20' } })
    await expect(size).toHaveValue('20')
    await userEvent.click(ui.getByRole('tab', { name: text('content.customCss.title') }))
    await expect(ui.getByRole('textbox', { name: 'CSS' })).toHaveValue(preset.css)
    const preview = context.canvasElement.ownerDocument.querySelector('iframe[data-ylc-css-preview="messenger"]')
    await expect(preview).toBeVisible()
    await expect(preview?.getAttribute('srcdoc')).toMatch(/--extension-yt-live-chat-font-size:\s*20px/)
  },
}
