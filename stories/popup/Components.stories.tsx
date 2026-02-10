import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TbHeartDollar, TbLanguage, TbLink, TbMessageCircle, TbSunMoon } from 'react-icons/tb'
import { LanguageSelector } from '@/entrypoints/popup/components/LanguageSelector'
import { Links } from '@/entrypoints/popup/components/Links'
import { PopupItemRow } from '@/entrypoints/popup/components/PopupItemRow'
import { ThemeModeSelector } from '@/entrypoints/popup/components/ThemeModeSelector'
import { YTDLiveChatSwitch } from '@/entrypoints/popup/components/YTDLiveChatSwitch'
import { useGlobalSettingStore } from '@/shared/stores'
import type { ThemeMode } from '@/shared/theme'

type PopupComponentsStoryProps = {
  ytdLiveChatEnabled: boolean
  themeMode: ThemeMode
}

const PopupComponentsPreview = ({ ytdLiveChatEnabled, themeMode }: PopupComponentsStoryProps) => {
  const { t } = useTranslation()

  useEffect(() => {
    useGlobalSettingStore.setState({ ytdLiveChat: ytdLiveChatEnabled, themeMode })
  }, [themeMode, ytdLiveChatEnabled])

  return (
    <div className='w-[450px] rounded-md overflow-hidden ylc-theme-shadow-sm ylc-theme-surface-muted py-2'>
      <PopupItemRow icon={TbLanguage} title={t('popup.language')} data={<LanguageSelector />} isLast={false} />
      <PopupItemRow icon={TbSunMoon} title={t('popup.theme')} data={<ThemeModeSelector />} isLast={false} />
      <PopupItemRow icon={TbMessageCircle} title={t('popup.showChatOnFullscreen')} data={<YTDLiveChatSwitch />} isLast={false} />
      <PopupItemRow icon={TbLink} title={t('popup.links')} data={<Links />} isLast={false} />
      <PopupItemRow
        icon={TbHeartDollar}
        title={t('popup.donate')}
        actionWidth='wide'
        data={
          <a href='https://ko-fi.com/D1D01A39U6' target='_blank' rel='noreferrer'>
            <img
              height='36'
              style={{ border: '0px', height: '36px' }}
              src='https://storage.ko-fi.com/cdn/kofi1.png?v=6'
              alt='Buy Me a Coffee at ko-fi.com'
            />
          </a>
        }
        isLast={true}
      />
    </div>
  )
}

const meta = {
  title: 'Popup/Components',
  component: PopupComponentsPreview,
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
} satisfies Meta<typeof PopupComponentsPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Gallery: Story = {}
