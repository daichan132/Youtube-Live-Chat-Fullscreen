import type { Meta, StoryObj } from '@storybook/react-vite'
import { PresetSettingContent } from '@/entrypoints/content/features/YTDLiveChatSetting/components/PresetContent/PresetSettingContent'
import { ylcSimpleSetting, ylcTransparentSetting } from '@/shared/utils'

type PresetSettingContentStoryProps = {
  preset: 'transparent' | 'simple'
}

const PresetSettingContentPreview = ({ preset }: PresetSettingContentStoryProps) => {
  return (
    <div className='w-[480px] bg-white p-4 rounded-lg border border-solid border-black/10'>
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
  },
  argTypes: {
    preset: {
      control: 'radio',
      options: ['transparent', 'simple'],
    },
  },
} satisfies Meta<typeof PresetSettingContentPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
