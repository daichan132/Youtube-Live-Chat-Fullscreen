import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { YTDLiveChatSetting } from '@/entrypoints/content/features/YTDLiveChatSetting/components/YTDLiveChatSetting'
import { useGlobalSettingStore, useYTDLiveChatNoLsStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'

type SettingModalStoryProps = {
  tab: 'preset' | 'setting'
  themeMode: ThemeMode
}

const SettingModalPreview = ({ tab, themeMode }: SettingModalStoryProps) => {
  useEffect(() => {
    useGlobalSettingStore.setState({ themeMode })
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
  }, [tab, themeMode])

  return (
    <div className='w-[1000px] h-[720px] ylc-theme-surface-muted p-6'>
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
    themeMode: 'system',
  },
  argTypes: {
    tab: {
      control: 'radio',
      options: ['preset', 'setting'],
    },
    themeMode: {
      control: 'radio',
      options: ['system', 'light', 'dark'],
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
