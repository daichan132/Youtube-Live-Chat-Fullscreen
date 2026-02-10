import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import Popup from '@/entrypoints/popup/Popup'
import { useGlobalSettingStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'

type PopupStoryProps = {
  ytdLiveChatEnabled: boolean
  themeMode: ThemeMode
}

const PopupPreview = ({ ytdLiveChatEnabled, themeMode }: PopupStoryProps) => {
  useEffect(() => {
    useGlobalSettingStore.setState({ ytdLiveChat: ytdLiveChatEnabled, themeMode })
  }, [themeMode, ytdLiveChatEnabled])

  return (
    <div className='rounded-md overflow-hidden ylc-theme-shadow-sm'>
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
    themeMode: 'system',
  },
  argTypes: {
    ytdLiveChatEnabled: {
      control: 'boolean',
    },
    themeMode: {
      control: 'radio',
      options: ['system', 'light', 'dark'],
    },
  },
} satisfies Meta<typeof PopupPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
