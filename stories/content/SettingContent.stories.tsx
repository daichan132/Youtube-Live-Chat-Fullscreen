import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { SettingContent } from '@/entrypoints/content/features/YTDLiveChatSetting/components/SettingContent'
import { useGlobalSettingStore, useYTDLiveChatStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'

type SettingContentStoryProps = {
  alwaysOnDisplay: boolean
  themeMode: ThemeMode
}

const SettingContentPreview = ({ alwaysOnDisplay, themeMode }: SettingContentStoryProps) => {
  useEffect(() => {
    useGlobalSettingStore.setState({ themeMode })
    useYTDLiveChatStore.setState({
      alwaysOnDisplay,
      chatOnlyDisplay: false,
      userNameDisplay: true,
      userIconDisplay: true,
      superChatBarDisplay: true,
    })
  }, [alwaysOnDisplay, themeMode])

  return (
    <div className='w-[480px] max-w-full box-border h-[560px] ylc-theme-surface-muted ylc-theme-glass-panel-muted p-3 overflow-y-auto rounded-lg border border-solid ylc-theme-border'>
      <p className='text-xs ylc-theme-text-muted mt-0 mb-3 px-1'>Action area is standardized with responsive width behavior.</p>
      <SettingContent />
    </div>
  )
}

const meta = {
  title: 'Content/SettingContent',
  component: SettingContentPreview,
  tags: ['autodocs'],
  args: {
    alwaysOnDisplay: true,
    themeMode: 'system',
  },
  argTypes: {
    alwaysOnDisplay: {
      control: 'boolean',
    },
    themeMode: {
      control: 'radio',
      options: ['system', 'light', 'dark'],
    },
  },
} satisfies Meta<typeof SettingContentPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
