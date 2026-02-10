import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { Draggable } from '@/entrypoints/content/features/Draggable/components/Draggable'
import { useGlobalSettingStore, useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'

type DraggableStoryProps = {
  width: number
  height: number
  themeMode: ThemeMode
}

const DraggablePreview = ({ width, height, themeMode }: DraggableStoryProps) => {
  useEffect(() => {
    useGlobalSettingStore.setState({ themeMode })
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
  }, [height, themeMode, width])

  return (
    <div className='relative w-[960px] h-[540px] ylc-theme-surface-muted rounded-lg overflow-hidden'>
      <Draggable>
        <div className='w-full h-full rounded-lg border ylc-theme-border p-6 ylc-theme-text-primary' style={{ background: 'var(--ylc-overlay-panel)' }}>
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
    themeMode: 'system',
  },
  argTypes: {
    width: {
      control: { type: 'range', min: 320, max: 700, step: 10 },
    },
    height: {
      control: { type: 'range', min: 220, max: 420, step: 10 },
    },
    themeMode: {
      control: 'radio',
      options: ['system', 'light', 'dark'],
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
