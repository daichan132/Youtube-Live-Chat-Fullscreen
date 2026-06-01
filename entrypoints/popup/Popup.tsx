import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { type IconType, TbArchive, TbHeartDollar, TbLanguage, TbLink, TbMessageCircle, TbSunMoon } from '@/shared/components/icons'
import { isRTL } from '@/shared/i18n/rtl'
import { useGlobalSettingStore } from '@/shared/stores'
import { useResolvedThemeMode } from '@/shared/theme'
import { DataTransfer } from './components/DataTransfer'
import { LanguageSelector } from './components/LanguageSelector'
import { Links } from './components/Links'
import { PopupItemRow } from './components/PopupItemRow'
import { ThemeModeSelector } from './components/ThemeModeSelector'
import { YTDLiveChatSwitch } from './components/YTDLiveChatSwitch'

type PopupItem = {
  id: string
  icon?: IconType
  title: string
  data: ReactNode
}

export const Popup = () => {
  const { t, i18n } = useTranslation()
  const themeMode = useGlobalSettingStore(state => state.themeMode)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)
  const items: PopupItem[] = [
    {
      id: 'toggle-chat',
      icon: TbMessageCircle,
      title: t('popup.showChatOnFullscreen'),
      data: <YTDLiveChatSwitch />,
    },
    {
      id: 'theme',
      icon: TbSunMoon,
      title: t('popup.theme'),
      data: <ThemeModeSelector />,
    },
    {
      id: 'data-transfer',
      icon: TbArchive,
      title: t('popup.dataTransfer'),
      data: <DataTransfer />,
    },
    {
      id: 'language',
      icon: TbLanguage,
      title: t('popup.language'),
      data: <LanguageSelector />,
    },
    {
      id: 'links',
      icon: TbLink,
      title: t('popup.links'),
      data: <Links />,
    },
    {
      id: 'donate',
      icon: TbHeartDollar,
      title: t('popup.donate'),
      data: (
        <a href='https://ko-fi.com/D1D01A39U6' target='_blank' rel='noopener noreferrer' className='ylc-theme-donate-link'>
          <img
            height='36'
            className='ylc-theme-donate-image'
            src='https://storage.ko-fi.com/cdn/kofi1.png?v=6'
            alt='Buy Me a Coffee at ko-fi.com'
          />
        </a>
      ),
    },
  ]

  return (
    <div
      data-ylc-theme={resolvedThemeMode}
      dir={isRTL(i18n.language) ? 'rtl' : 'ltr'}
      className='flex flex-col w-[450px] max-w-full box-border m-0 rounded-md border border-solid ylc-theme-border overflow-hidden ylc-theme-surface'
    >
      <div className='flex-grow ylc-theme-surface-muted py-2'>
        {items.map((item, index) => (
          <PopupItemRow key={item.id} icon={item.icon} title={item.title} data={item.data} isLast={index === items.length - 1} />
        ))}
      </div>
    </div>
  )
}
