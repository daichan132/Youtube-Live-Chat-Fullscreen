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
    <div className='flex flex-col w-[480px] rounded-xl ylc-theme-surface ylc-theme-glass-panel ylc-theme-shadow-md overflow-hidden border border-solid ylc-theme-border'>
      <div className='flex justify-between items-center px-2 py-1.5'>
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
          <RiCloseLine className='cursor-pointer rounded-md p-2 transition-colors duration-200 ylc-theme-elevated ylc-theme-text-secondary hover:text-[var(--ylc-text-primary)] hover:bg-[var(--ylc-hover-surface)]' size={22} />
        </div>
      </div>
      <div
        className='flex-grow overflow-y-scroll h-[380px] ylc-theme-surface-muted ylc-theme-glass-panel-muted p-2 rounded-2xl'
        style={{ overscrollBehavior: 'contain' }}
      >
        {children}
      </div>
      <div className='flex justify-end items-center px-3 py-2.5 ylc-theme-surface ylc-theme-glass-panel'>
        <div className='ylc-theme-footer-links'>
          <a
            href='https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd'
            target='_blank'
            rel='noopener noreferrer'
            className='ylc-theme-footer-link'
          >
            {t('content.setting.footer.chrome')}
          </a>
          <a
            href='https://addons.mozilla.org/en-US/firefox/addon/youtube-live-chat-fullscreen/'
            target='_blank'
            rel='noopener noreferrer'
            className='ylc-theme-footer-link'
          >
            {t('content.setting.footer.firefox')}
          </a>
          <a
            href='https://github.com/daichan132/Youtube-Live-Chat-Fullscreen'
            target='_blank'
            rel='noopener noreferrer'
            className='ylc-theme-footer-link'
          >
            GitHub
          </a>
          <a
            href='https://ko-fi.com/daichan132'
            target='_blank'
            rel='noopener noreferrer'
            className='ylc-theme-footer-link'
          >
            {t('content.setting.footer.donate')}
          </a>
        </div>
      </div>
    </div>
  )
}

const PresetDeleteConfirmModalPreview = () => {
  const { t } = useTranslation()

  return (
    <div className='relative w-[480px] max-w-full h-[300px] rounded-xl overflow-hidden ylc-theme-surface-muted border border-solid ylc-theme-border'>
      <div className='absolute inset-0 bg-black/35' />
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,380px)] ylc-theme-surface rounded-xl ylc-theme-shadow-md outline-none overflow-hidden ylc-theme-dialog-border'>
        <div className='px-5 py-4 ylc-theme-dialog-divider-bottom'>
          <h3 className='m-0 text-base leading-6 font-semibold ylc-theme-text-primary'>{t('content.preset.delete')}</h3>
        </div>
        <div className='px-5 py-4'>
          <p className='m-0 text-sm leading-6 ylc-theme-text-secondary'>{t('content.preset.deleteConfirmationMessage')}</p>
        </div>
        <div className='px-5 py-3 flex justify-end items-center gap-2 ylc-theme-dialog-divider-top'>
          <button
            type='button'
            className='h-9 px-3 rounded-md text-sm leading-none font-medium cursor-pointer transition-colors border-none bg-transparent ylc-theme-focus-ring-soft ylc-theme-text-primary hover:bg-[var(--ylc-hover-surface)]'
          >
            {t('content.preset.cancel')}
          </button>
          <button
            type='button'
            className='h-9 px-4 rounded-md text-sm leading-none font-semibold cursor-pointer transition-opacity border-none ylc-theme-focus-ring-soft bg-[var(--ylc-danger-border)] text-white hover:opacity-90'
          >
            {t('content.preset.delete')}
          </button>
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
      <div className='mt-6'>
        <section className='ylc-theme-surface p-4 rounded-xl border border-solid ylc-theme-border'>
          <h3 className='text-[16px] mt-0 mb-3 ylc-theme-text-primary'>Preset Delete Confirmation Modal</h3>
          <p className='text-xs mt-0 mb-3 ylc-theme-text-muted'>Displayed when deleting a preset item.</p>
          <div className='flex justify-center'>
            <PresetDeleteConfirmModalPreview />
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
