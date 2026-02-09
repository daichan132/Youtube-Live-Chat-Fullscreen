import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { YTDLiveChatSetting } from '@/entrypoints/content/features/YTDLiveChatSetting/components/YTDLiveChatSetting'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'

type SettingModalStoryProps = {
  tab: 'preset' | 'setting'
}

const SettingModalPreview = ({ tab }: SettingModalStoryProps) => {
  useEffect(() => {
    useYTDLiveChatNoLsStore.setState({
      isOpenSettingModal: true,
      menuItem: tab,
      isHover: true,
    })

    return () => {
      useYTDLiveChatNoLsStore.setState({
        isOpenSettingModal: false,
        menuItem: 'preset',
        isHover: false,
      })
    }
  }, [tab])

  return (
    <div className='w-[1000px] h-[720px] bg-[#0f0f0f] p-6'>
      <YTDLiveChatSetting />
    </div>
  )
}

const meta = {
  title: 'Content/YTDLiveChatSetting',
  component: SettingModalPreview,
  tags: ['autodocs'],
  args: {
    tab: 'preset',
  },
  argTypes: {
    tab: {
      control: 'radio',
      options: ['preset', 'setting'],
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SettingModalPreview>

export default meta
type Story = StoryObj<typeof meta>

export const PresetTab: Story = {}

export const SettingTab: Story = {
  args: {
    tab: 'setting',
  },
}
