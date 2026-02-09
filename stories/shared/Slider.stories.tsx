import type { Meta, StoryObj } from '@storybook/react-vite'
import { Slider } from '@/shared/components/Slider'

type SliderStoryProps = {
  value: number
}

const SliderPreview = ({ value }: SliderStoryProps) => (
  <div className='w-[220px] flex justify-center py-6'>
    <Slider value={value} />
  </div>
)

const meta = {
  title: 'Shared/Slider',
  component: SliderPreview,
  tags: ['autodocs'],
  args: {
    value: 0.5,
  },
  argTypes: {
    value: {
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
      },
    },
  },
} satisfies Meta<typeof SliderPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
