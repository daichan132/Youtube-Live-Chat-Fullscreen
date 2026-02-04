import type { TFunction } from 'i18next'
import type React from 'react'
import type { IconType } from 'react-icons'
import { BiDonateHeart } from 'react-icons/bi'
import { MdChatBubbleOutline, MdLanguage, MdLink } from 'react-icons/md'
import { LanguageSelector } from '../components/LanguageSelector'
import { Links } from '../components/Links'
import { YTDLiveChatSwitch } from '../components/YTDLiveChatSwitch'

export interface PopupItem {
  icon?: IconType
  title: string
  data: React.ReactNode
}

export const createPopupItems = (t: TFunction) => {
  const items: PopupItem[] = [
    {
      icon: MdLanguage,
      title: t('popup.language'),
      data: <LanguageSelector />,
    },
    {
      icon: MdChatBubbleOutline,
      title: t('popup.showChatOnFullscreen'),
      data: <YTDLiveChatSwitch />,
    },
    {
      icon: MdLink,
      title: t('popup.links'),
      data: <Links />,
    },
    {
      icon: BiDonateHeart,
      title: t('popup.donate'),
      data: (
        <a href='https://ko-fi.com/D1D01A39U6' target='_blank' rel='noreferrer'>
          <img
            height='36'
            style={{ border: '0px', height: '36px' }}
            src='https://storage.ko-fi.com/cdn/kofi1.png?v=6'
            alt='Buy Me a Coffee at ko-fi.com'
          />
        </a>
      ),
    },
  ]

  return items
}
