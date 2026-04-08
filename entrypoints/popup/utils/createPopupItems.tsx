import type { TFunction } from 'i18next'
import type React from 'react'
import { type IconType, TbArchive, TbHeartDollar, TbLanguage, TbLink, TbMessageCircle, TbSunMoon } from '@/shared/components/icons'
import { DataTransfer } from '../components/DataTransfer'
import { LanguageSelector } from '../components/LanguageSelector'
import { Links } from '../components/Links'
import { ThemeModeSelector } from '../components/ThemeModeSelector'
import { YTDLiveChatSwitch } from '../components/YTDLiveChatSwitch'

export interface PopupItem {
  id: string
  icon?: IconType
  title: string
  data: React.ReactNode
  actionWidth?: 'default' | 'wide'
}

export const createPopupItems = (t: TFunction) => {
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

  return items
}
