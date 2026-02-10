import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { PresetContent } from '@/entrypoints/content/features/YTDLiveChatSetting/components/PresetContent'
import { useGlobalSettingStore, useYTDLiveChatStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'
import { ylcInitSetting, ylcSimpleSetting, ylcTransparentSetting } from '@/shared/utils'

type PresetContentStoryProps = {
  themeMode: ThemeMode
}

const PresetContentPreview = ({ themeMode }: PresetContentStoryProps) => {
  useEffect(() => {
    useGlobalSettingStore.setState({ themeMode })
    useYTDLiveChatStore.setState({
      presetItemIds: ['default1', 'default2', 'default3'],
      presetItemStyles: {
        default1: ylcInitSetting,
        default2: ylcTransparentSetting,
        default3: ylcSimpleSetting,
      },
      presetItemTitles: {
        default1: 'Default',
        default2: 'Transparent',
        default3: 'Simple',
      },
      addPresetEnabled: true,
    })
  }, [themeMode])

  return (
    <div className='w-[480px] max-w-full box-border h-[560px] ylc-theme-surface-muted p-3 overflow-y-auto rounded-lg'>
      <PresetContent />
    </div>
  )
}

const meta = {
  title: 'Content/PresetContent',
  component: PresetContentPreview,
  tags: ['autodocs'],
  args: {
    themeMode: 'system',
  },
  argTypes: {
    themeMode: {
      control: 'radio',
      options: ['system', 'light', 'dark'],
    },
  },
} satisfies Meta<typeof PresetContentPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
