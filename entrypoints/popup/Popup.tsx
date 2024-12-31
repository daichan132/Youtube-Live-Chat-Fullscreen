import React from 'react'

import { useTranslation } from 'react-i18next'
import { IoChatboxOutline, IoLanguage, IoLinkOutline } from 'react-icons/io5'

import type { IconType } from 'react-icons'
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
      icon: IoLanguage,
      title: t('popup.language'),
      data: <LanguageSelector />,
    },
    {
      icon: IoChatboxOutline,
      title: t('popup.showChatOnFullscreen'),
      data: <YTDLiveChatSwitch />,
    },
    {
      icon: IoLinkOutline,
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
        <div className='b-t-gray-3 b-t-solid b-t-1 px-3 py-3 flex justify-end bg-white text-sm'>
          <div>
            {t('content.setting.footer')}
            <a
              href='https://smart-persimmon-6f9.notion.site/Chrome-extension-help-1606385e75a14d65ae4d0e42ba47fb84?pvs=4'
              target='_blank'
              rel='noopener noreferrer'
              className='text-gray-800'
            >
              {t('content.setting.help')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Popup
