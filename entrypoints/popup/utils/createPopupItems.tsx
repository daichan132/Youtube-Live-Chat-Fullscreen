import type { TFunction } from 'i18next'
import type React from 'react'
import type { IconType } from 'react-icons'
import { TbHeartDollar, TbLanguage, TbLink, TbMessageCircle, TbSunMoon } from 'react-icons/tb'
import { LanguageSelector } from '../components/LanguageSelector'
import { Links } from '../components/Links'
import { ThemeModeSelector } from '../components/ThemeModeSelector'
import { YTDLiveChatSwitch } from '../components/YTDLiveChatSwitch'

export interface PopupItem {
  icon?: IconType
  title: string
  data: React.ReactNode
  actionWidth?: 'default' | 'wide'
}

export const createPopupItems = (t: TFunction) => {
  const items: PopupItem[] = [
    {
      icon: TbLanguage,
      title: t('popup.language'),
      data: <LanguageSelector />,
    },
    {
      icon: TbSunMoon,
      title: t('popup.theme'),
      data: <ThemeModeSelector />,
    },
    {
      icon: TbMessageCircle,
      title: t('popup.showChatOnFullscreen'),
      data: <YTDLiveChatSwitch />,
    },
    {
      icon: TbLink,
      title: t('popup.links'),
      data: <Links />,
    },
    {
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

  return items
}
