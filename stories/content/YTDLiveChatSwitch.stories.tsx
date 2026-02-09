import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { YTDLiveChatSwitch } from '@/entrypoints/content/features/YTDLiveChatSwitch/components/YTDLiveChatSwitch'
import { useGlobalSettingStore } from '@/shared/stores'

type ContentSwitchStoryProps = {
  enabled: boolean
}

const ContentSwitchPreview = ({ enabled }: ContentSwitchStoryProps) => {
  useEffect(() => {
    useGlobalSettingStore.setState({ ytdLiveChat: enabled })
  }, [enabled])

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
  },
  argTypes: {
    enabled: {
      control: 'boolean',
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
