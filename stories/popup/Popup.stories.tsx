import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import Popup from '@/entrypoints/popup/Popup'
import { useGlobalSettingStore } from '@/shared/stores'

type PopupStoryProps = {
  ytdLiveChatEnabled: boolean
}

const PopupPreview = ({ ytdLiveChatEnabled }: PopupStoryProps) => {
  useEffect(() => {
    useGlobalSettingStore.setState({ ytdLiveChat: ytdLiveChatEnabled })
  }, [ytdLiveChatEnabled])

  return (
    <div className='rounded-md overflow-hidden shadow-lg'>
      <Popup />
    </div>
  )
}

const meta = {
  title: 'Popup/Popup',
  component: PopupPreview,
  tags: ['autodocs'],
  args: {
    ytdLiveChatEnabled: true,
  },
  argTypes: {
    ytdLiveChatEnabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof PopupPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
