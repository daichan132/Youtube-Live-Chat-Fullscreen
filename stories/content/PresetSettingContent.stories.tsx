import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { PresetSettingContent } from '@/entrypoints/content/features/YTDLiveChatSetting/components/PresetContent/PresetSettingContent'
import { useGlobalSettingStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'
import { ylcSimpleSetting, ylcTransparentSetting } from '@/shared/utils'

type PresetSettingContentStoryProps = {
  preset: 'transparent' | 'simple'
  themeMode: ThemeMode
}

const PresetSettingContentPreview = ({ preset, themeMode }: PresetSettingContentStoryProps) => {
  useEffect(() => {
    useGlobalSettingStore.setState({ themeMode })
  }, [themeMode])

  return (
    <div className='w-[480px] max-w-full box-border ylc-theme-surface p-4 rounded-lg border border-solid ylc-theme-border'>
      <p className='text-xs ylc-theme-text-muted mt-0 mb-3'>Preset rows share the same action width contract as Setting rows.</p>
      <PresetSettingContent ylcStyle={preset === 'transparent' ? ylcTransparentSetting : ylcSimpleSetting} isOpen={true} />
    </div>
  )
}

const meta = {
  title: 'Content/PresetSettingContent',
  component: PresetSettingContentPreview,
  tags: ['autodocs'],
  args: {
    preset: 'transparent',
    themeMode: 'system',
  },
  argTypes: {
    preset: {
      control: 'radio',
      options: ['transparent', 'simple'],
    },
    themeMode: {
      control: 'radio',
      options: ['system', 'light', 'dark'],
    },
  },
} satisfies Meta<typeof PresetSettingContentPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
