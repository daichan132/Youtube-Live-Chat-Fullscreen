import React from 'react'

import { useTranslation } from 'react-i18next'

import type { IconType } from 'react-icons'
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
  ]

  return (
    <div className='flex flex-col w-[450px] m-0'>
      <div className='flex-grow bg-gray-100'>
        {items.map((item, i) => {
          return (
            <React.Fragment key={`${item.title}-${i}`}>
              <div className='flex justify-between items-center px-3 py-3 opacity-100 transition-all duration-200'>
                <div className={item.icon ? 'flex items-center text-sm' : 'text-sm'}>
                  {item.icon ? (
                    <item.icon size={16} className='mr-3 outline outline-1 outline-gray-300 text-gray-800 p-2 rounded bg-white' />
                  ) : null}
                  <div>{item.title}</div>
                </div>
                {item.data}
              </div>
              {i === items.length - 1 ? null : <hr className='border-none h-px bg-gray-300 mx-5' />}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default Popup
