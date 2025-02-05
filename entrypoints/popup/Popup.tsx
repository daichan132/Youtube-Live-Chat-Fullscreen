import React from 'react'

import { useTranslation } from 'react-i18next'

import type { IconType } from 'react-icons'
import { BiDonateHeart } from 'react-icons/bi'
import { MdChatBubbleOutline, MdLanguage, MdLink } from 'react-icons/md'
import { LanguageSelector } from './components/LanguageSelector'
import { Links } from './components/Links'
import { YTDLiveChatSwitch } from './components/YTDLiveChatSwitch'

interface itemType {
  icon?: IconType
  title: string
  data: React.ReactNode
}

const Popup = () => {
  const { t } = useTranslation()
  const items: itemType[] = [
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

  return (
    <div className='flex flex-col w-[450px] m-0'>
      <div className='flex-grow bg-gray-100 py-2'>
        {items.map((item, i) => {
          return (
            <React.Fragment key={`${item.title}-${i}`}>
              <div className='flex justify-between items-center px-3 py-1 opacity-100 transition-all duration-200'>
                <div className={item.icon ? 'flex items-center text-sm' : 'text-sm'}>
                  {item.icon ? (
                    <item.icon size={16} className='mr-3 outline outline-1 outline-gray-300 text-gray-800 p-2 rounded bg-white' />
                  ) : null}
                  <div>{item.title}</div>
                </div>
                {item.data}
              </div>
              {i === items.length - 1 ? null : <hr className='border-none h-px bg-gray-300 mx-3' />}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default Popup
