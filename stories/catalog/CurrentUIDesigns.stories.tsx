import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import Popup from '@/entrypoints/popup/Popup'
import { YTDLiveChatSwitch } from '@/entrypoints/content/features/YTDLiveChatSwitch/components/YTDLiveChatSwitch'
import { Draggable } from '@/entrypoints/content/features/Draggable/components/Draggable'
import { PresetContent } from '@/entrypoints/content/features/YTDLiveChatSetting/components/PresetContent'
import { SettingContent } from '@/entrypoints/content/features/YTDLiveChatSetting/components/SettingContent'
import { useGlobalSettingStore, useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { ylcInitSetting, ylcSimpleSetting, ylcTransparentSetting } from '@/shared/utils'

type CurrentUIDesignsStoryProps = {
  ytdLiveChatEnabled: boolean
}

const CurrentUIDesignsPreview = ({ ytdLiveChatEnabled }: CurrentUIDesignsStoryProps) => {
  useEffect(() => {
    useGlobalSettingStore.setState({ ytdLiveChat: ytdLiveChatEnabled })
    useYTDLiveChatStore.setState({
      ...ylcInitSetting,
      coordinates: { x: 24, y: 24 },
      size: { width: 380, height: 250 },
      fontColor: { r: 255, g: 255, b: 255, a: 1 },
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
    })
    useYTDLiveChatNoLsStore.setState({
      isIframeLoaded: true,
      isDisplay: true,
      isHover: true,
      isClipPath: false,
      clip: { header: 0, input: 0 },
    })
  }, [ytdLiveChatEnabled])

  return (
    <div className='w-[1540px] p-6 bg-[#f6f7f8] rounded-xl'>
      <h2 className='text-[20px] mb-4 mt-0'>Current UI Design Catalog</h2>
      <div className='grid grid-cols-[470px_1fr] gap-6'>
        <section className='bg-white p-4 rounded-xl border border-solid border-black/10'>
          <h3 className='text-[16px] mt-0 mb-3'>Popup</h3>
          <Popup />
        </section>
        <section className='bg-[#0f0f0f] p-4 rounded-xl border border-solid border-black/15'>
          <h3 className='text-[16px] mt-0 mb-3 text-white'>Fullscreen Toggle + Draggable Overlay</h3>
          <div className='flex gap-4 items-start'>
            <div className='w-[56px] h-[56px] bg-[#212121] rounded-md p-2'>
              <YTDLiveChatSwitch />
            </div>
            <div className='relative w-[900px] h-[420px] bg-[#161616] rounded-lg overflow-hidden'>
              <Draggable>
                <div className='w-full h-full rounded-lg bg-gradient-to-br from-white/85 to-white/60 border border-white/50 p-6 text-black'>
                  <h4 className='m-0 text-[18px]'>Overlay Preview</h4>
                  <p className='mt-2 text-[14px]'>Current drag and resize frame design.</p>
                </div>
              </Draggable>
            </div>
          </div>
        </section>
      </div>
      <div className='grid grid-cols-2 gap-6 mt-6'>
        <section className='bg-white p-4 rounded-xl border border-solid border-black/10'>
          <h3 className='text-[16px] mt-0 mb-3'>Setting Panel</h3>
          <div className='h-[520px] overflow-y-auto bg-gray-100 rounded-lg p-3'>
            <SettingContent />
          </div>
        </section>
        <section className='bg-white p-4 rounded-xl border border-solid border-black/10'>
          <h3 className='text-[16px] mt-0 mb-3'>Preset Panel</h3>
          <div className='h-[520px] overflow-y-auto bg-gray-100 rounded-lg p-3'>
            <PresetContent />
          </div>
        </section>
      </div>
    </div>
  )
}

const meta = {
  title: 'Catalog/CurrentUIDesigns',
  component: CurrentUIDesignsPreview,
  tags: ['autodocs'],
  args: {
    ytdLiveChatEnabled: true,
  },
  argTypes: {
    ytdLiveChatEnabled: {
      control: 'boolean',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CurrentUIDesignsPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {}
