import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { PresetContent } from '@/entrypoints/content/features/YTDLiveChatSetting/components/PresetContent'
import { useYTDLiveChatStore } from '@/shared/stores'
import { ylcInitSetting, ylcSimpleSetting, ylcTransparentSetting } from '@/shared/utils'

const PresetContentPreview = () => {
  useEffect(() => {
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
  }, [])

  return (
    <div className='w-[480px] h-[560px] bg-gray-100 p-3 overflow-y-auto rounded-lg'>
      <PresetContent />
    </div>
  )
}

const meta = {
  title: 'Content/PresetContent',
  component: PresetContentPreview,
  tags: ['autodocs'],
} satisfies Meta<typeof PresetContentPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
