import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { Draggable } from '@/entrypoints/content/features/Draggable/components/Draggable'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'

type DraggableStoryProps = {
  width: number
  height: number
}

const DraggablePreview = ({ width, height }: DraggableStoryProps) => {
  useEffect(() => {
    useYTDLiveChatStore.setState({
      coordinates: { x: 40, y: 40 },
      size: { width, height },
      fontColor: { r: 255, g: 255, b: 255, a: 1 },
    })
    useYTDLiveChatNoLsStore.setState({
      isIframeLoaded: true,
      isDisplay: true,
      isHover: true,
      isClipPath: false,
      clip: { header: 0, input: 0 },
    })
  }, [width, height])

  return (
    <div className='relative w-[960px] h-[540px] bg-[#0f0f0f] rounded-lg overflow-hidden'>
      <Draggable>
        <div className='w-full h-full rounded-lg bg-gradient-to-br from-white/85 to-white/60 border border-white/50 p-6 text-black'>
          <h3 className='m-0 text-[18px]'>Overlay Preview</h3>
          <p className='mt-2 text-[14px]'>Drag with the handle on the top-right. Resize from window edges.</p>
        </div>
      </Draggable>
    </div>
  )
}

const meta = {
  title: 'Content/Draggable',
  component: DraggablePreview,
  tags: ['autodocs'],
  args: {
    width: 400,
    height: 260,
  },
  argTypes: {
    width: {
      control: { type: 'range', min: 320, max: 700, step: 10 },
    },
    height: {
      control: { type: 'range', min: 220, max: 420, step: 10 },
    },
  },
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'youtube-dark',
    },
  },
} satisfies Meta<typeof DraggablePreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
