import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { YTDLiveChatSwitch } from '@/entrypoints/content/features/YTDLiveChatSwitch/components/YTDLiveChatSwitch'
import { useGlobalSettingStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'

type ContentSwitchStoryProps = {
  enabled: boolean
  themeMode: ThemeMode
}

const ContentSwitchPreview = ({ enabled, themeMode }: ContentSwitchStoryProps) => {
  useEffect(() => {
    useGlobalSettingStore.setState({ ytdLiveChat: enabled, themeMode })
  }, [enabled, themeMode])

  return (
    <div className='bg-[#212121] rounded-md p-2 w-[56px] h-[56px] flex items-center justify-center'>
      <div className='w-full h-full'>
        <YTDLiveChatSwitch />
      </div>
    </div>
  )
}

const meta = {
  title: 'Content/YTDLiveChatSwitch',
  component: ContentSwitchPreview,
  tags: ['autodocs'],
  args: {
    enabled: true,
    themeMode: 'system',
  },
  argTypes: {
    enabled: {
      control: 'boolean',
    },
    themeMode: {
      control: 'radio',
      options: ['system', 'light', 'dark'],
    },
  },
  parameters: {
    backgrounds: {
      default: 'youtube-dark',
    },
  },
} satisfies Meta<typeof ContentSwitchPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
