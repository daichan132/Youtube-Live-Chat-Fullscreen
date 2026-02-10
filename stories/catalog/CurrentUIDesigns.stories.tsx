import type { Meta, StoryObj } from '@storybook/react-vite'
import classNames from 'classnames'
import { type ReactNode, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RiCloseLine } from 'react-icons/ri'
import { TbLayoutGrid, TbSettings2 } from 'react-icons/tb'
import Popup from '@/entrypoints/popup/Popup'
import { YTDLiveChatSwitch } from '@/entrypoints/content/features/YTDLiveChatSwitch/components/YTDLiveChatSwitch'
import { Draggable } from '@/entrypoints/content/features/Draggable/components/Draggable'
import { PresetContent } from '@/entrypoints/content/features/YTDLiveChatSetting/components/PresetContent'
import { SettingContent } from '@/entrypoints/content/features/YTDLiveChatSetting/components/SettingContent'
import { useGlobalSettingStore, useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'
import { ylcInitSetting, ylcSimpleSetting, ylcTransparentSetting } from '@/shared/utils'

type CurrentUIDesignsStoryProps = {
  ytdLiveChatEnabled: boolean
  themeMode: ThemeMode
}

type SettingPanelFrameProps = {
  tab: 'preset' | 'setting'
  children: ReactNode
}

const SettingPanelFrame = ({ tab, children }: SettingPanelFrameProps) => {
  const { t } = useTranslation()
  const tabs: { key: 'preset' | 'setting'; label: string; icon: typeof TbLayoutGrid }[] = [
    { key: 'preset', label: t('content.setting.header.preset'), icon: TbLayoutGrid },
    { key: 'setting', label: t('content.setting.header.setting'), icon: TbSettings2 },
  ]

  return (
    <div className='flex flex-col w-[480px] rounded-xl ylc-theme-surface ylc-theme-shadow-md overflow-hidden border border-solid ylc-theme-border'>
      <div className='flex justify-between items-center px-3 py-2.5 border-b border-b-solid ylc-theme-border'>
        <div className='ylc-theme-tablist'>
          {tabs.map(item => (
            <button
              key={item.key}
              type='button'
              className={classNames(
                'ylc-theme-tab ylc-theme-focus-ring-soft',
                tab === item.key && 'ylc-theme-tab-active',
              )}
              aria-pressed={tab === item.key}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>
        <div className='flex items-center'>
          <RiCloseLine className='cursor-default rounded p-2 transition-colors duration-200 ylc-theme-icon-button' size={22} />
        </div>
      </div>
      <div className='flex-grow overflow-y-scroll h-[380px] ylc-theme-surface-muted p-2' style={{ overscrollBehavior: 'contain' }}>
        {children}
      </div>
      <div className='flex justify-end items-center px-3 py-2 border-t border-t-solid ylc-theme-border ylc-theme-surface text-xs'>
        <div className='flex gap-4'>
          <a
            href='https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd'
            target='_blank'
            rel='noopener noreferrer'
            className='ylc-theme-text-muted hover:text-[var(--ylc-text-primary)] transition-colors'
          >
            {t('content.setting.footer.chrome')}
          </a>
          <a
            href='https://addons.mozilla.org/en-US/firefox/addon/youtube-live-chat-fullscreen/'
            target='_blank'
            rel='noopener noreferrer'
            className='ylc-theme-text-muted hover:text-[var(--ylc-text-primary)] transition-colors'
          >
            {t('content.setting.footer.firefox')}
          </a>
          <a
            href='https://ko-fi.com/daichan132'
            target='_blank'
            rel='noopener noreferrer'
            className='ylc-theme-text-muted hover:text-[var(--ylc-text-primary)] transition-colors'
          >
            {t('content.setting.footer.donate')}
          </a>
        </div>
      </div>
    </div>
  )
}

const CurrentUIDesignsPreview = ({ ytdLiveChatEnabled, themeMode }: CurrentUIDesignsStoryProps) => {
  useEffect(() => {
    useGlobalSettingStore.setState({ ytdLiveChat: ytdLiveChatEnabled, themeMode })
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
  }, [themeMode, ytdLiveChatEnabled])

  return (
    <div className='w-[1540px] p-6 ylc-theme-surface-muted rounded-xl'>
      <h2 className='text-[20px] mb-4 mt-0 ylc-theme-text-primary'>Current UI Design Catalog</h2>
      <div className='grid grid-cols-[470px_1fr] gap-6'>
        <section className='ylc-theme-surface p-4 rounded-xl border border-solid ylc-theme-border'>
          <h3 className='text-[16px] mt-0 mb-3 ylc-theme-text-primary'>Popup</h3>
          <p className='text-xs mt-0 mb-3 ylc-theme-text-muted'>Action area width is fixed per row type. Controls fill or center inside the slot.</p>
          <Popup />
        </section>
        <section className='ylc-theme-surface p-4 rounded-xl border border-solid ylc-theme-border'>
          <h3 className='text-[16px] mt-0 mb-3 ylc-theme-text-primary'>Fullscreen Toggle + Draggable Overlay</h3>
          <div className='flex gap-4 items-start'>
            <div className='w-[56px] h-[56px] bg-[#212121] rounded-md p-2'>
              <YTDLiveChatSwitch />
            </div>
            <div className='relative w-[900px] h-[420px] bg-[#161616] rounded-lg overflow-hidden'>
              <Draggable>
                <div className='w-full h-full rounded-lg border ylc-theme-border p-6 ylc-theme-text-primary' style={{ background: 'var(--ylc-overlay-panel)' }}>
                  <h4 className='m-0 text-[18px]'>Overlay Preview</h4>
                  <p className='mt-2 text-[14px]'>Current drag and resize frame design.</p>
                </div>
              </Draggable>
            </div>
          </div>
        </section>
      </div>
      <div className='grid grid-cols-2 gap-6 mt-6'>
        <section className='ylc-theme-surface p-4 rounded-xl border border-solid ylc-theme-border'>
          <h3 className='text-[16px] mt-0 mb-3 ylc-theme-text-primary'>Setting Panel</h3>
          <p className='text-xs mt-0 mb-3 ylc-theme-text-muted'>
            Includes header/footer and the same action-slot width rules used in fullscreen settings.
          </p>
          <div className='flex justify-center'>
            <SettingPanelFrame tab='setting'>
              <SettingContent />
            </SettingPanelFrame>
          </div>
        </section>
        <section className='ylc-theme-surface p-4 rounded-xl border border-solid ylc-theme-border'>
          <h3 className='text-[16px] mt-0 mb-3 ylc-theme-text-primary'>Preset Panel</h3>
          <div className='flex justify-center'>
            <SettingPanelFrame tab='preset'>
              <PresetContent />
            </SettingPanelFrame>
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
    themeMode: 'system',
  },
  argTypes: {
    ytdLiveChatEnabled: {
      control: 'boolean',
    },
    themeMode: {
      control: 'radio',
      options: ['system', 'light', 'dark'],
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CurrentUIDesignsPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {}
