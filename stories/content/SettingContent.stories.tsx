import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { SettingContent } from '@/entrypoints/content/features/YTDLiveChatSetting/components/SettingContent'
import { useYTDLiveChatStore } from '@/shared/stores'

type SettingContentStoryProps = {
  alwaysOnDisplay: boolean
}

const SettingContentPreview = ({ alwaysOnDisplay }: SettingContentStoryProps) => {
  useEffect(() => {
    useYTDLiveChatStore.setState({
      alwaysOnDisplay,
      chatOnlyDisplay: false,
      userNameDisplay: true,
      userIconDisplay: true,
      superChatBarDisplay: true,
    })
  }, [alwaysOnDisplay])

  return (
    <div className='w-[480px] h-[560px] bg-gray-100 p-3 overflow-y-auto rounded-lg'>
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
  },
  argTypes: {
    alwaysOnDisplay: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof SettingContentPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
