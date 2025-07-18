import classNames from 'classnames'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { FaRegUserCircle } from 'react-icons/fa'
import { IoChatbubbleEllipsesOutline, IoColorFillOutline, IoTimerOutline } from 'react-icons/io5'
import { MdBlurOn, MdExpand } from 'react-icons/md'
import { RiFontColor, RiFontFamily, RiFontSize2, RiUserLine } from 'react-icons/ri'
import { useShallow } from 'zustand/react/shallow'
import { useYTDLiveChatStore } from '@/shared/stores'
import type { SettingItemType } from '@/shared/types/ytdLiveChatSetting'
import { AlwaysOnDisplaySwitch } from './YLCChangeItems/AlwaysOnDisplaySwitch'
import { BgColorPicker } from './YLCChangeItems/BgColorPicker'
import { BlurSlider } from './YLCChangeItems/BlurSlider'
import { ChatOnlyDisplaySwitch } from './YLCChangeItems/ChatOnlyDisplaySwitch'
import { FontColorPicker } from './YLCChangeItems/FontColorPicker'
import { FontFamilyInput } from './YLCChangeItems/FontFamilyInput'
import { FontSizeSlider } from './YLCChangeItems/FontSizeSlider'
import { SpaceSlider } from './YLCChangeItems/SpaceSlider'
import { SuperChatBarDisplaySwitch } from './YLCChangeItems/SuperChatBarDisplaySwitch'
import { UserIconDisplaySwitch } from './YLCChangeItems/UserIconDisplaySwitch'
import { UserNameDisplaySwitch } from './YLCChangeItems/UserNameDisplaySwitch'

export const SettingContent = () => {
  const { alwaysOnDisplay } = useYTDLiveChatStore(
    useShallow(state => ({
      alwaysOnDisplay: state.alwaysOnDisplay,
    })),
  )
  const { t } = useTranslation()
  const items: SettingItemType[] = [
    {
      icon: IoTimerOutline,
      title: t('content.setting.alwaysOnDisplay'),
      data: <AlwaysOnDisplaySwitch />,
    },
    {
      icon: IoChatbubbleEllipsesOutline,
      title: t('content.setting.chatOnlyDisplay'),
      data: <ChatOnlyDisplaySwitch />,
      disable: !alwaysOnDisplay,
    },
    {
      icon: IoColorFillOutline,
      title: t('content.setting.backgroundColor'),
      data: <BgColorPicker />,
    },
    {
      icon: RiFontColor,
      title: t('content.setting.fontColor'),
      data: <FontColorPicker />,
    },
    {
      icon: RiFontFamily,
      title: t('content.setting.fontFamily'),
      data: <FontFamilyInput />,
    },
    {
      icon: RiFontSize2,
      title: t('content.setting.fontSize'),
      data: <FontSizeSlider />,
    },
    {
      icon: MdBlurOn,
      title: t('content.setting.blur'),
      data: <BlurSlider />,
    },
    {
      icon: MdExpand,
      title: t('content.setting.space'),
      data: <SpaceSlider />,
    },
    {
      icon: RiUserLine,
      title: t('content.setting.userNameDisplay'),
      data: <UserNameDisplaySwitch />,
    },
    {
      icon: FaRegUserCircle,
      title: t('content.setting.userIconDisplay'),
      data: <UserIconDisplaySwitch />,
    },
    {
      icon: IoChatbubbleEllipsesOutline,
      title: t('content.setting.superChatBarDisplay'),
      data: <SuperChatBarDisplaySwitch />,
    },
  ]
  return (
    <>
      {items.map((item, i) => (
        <React.Fragment key={item.title}>
          <div
            className={classNames(
              'flex justify-between items-center transition-all duration-200 opacity-100',
              !item.disable && 'px-4 py-3',
              item.disable && 'h-0 py-0 px-4 opacity-0 pointer-events-none overflow-hidden',
            )}
          >
            <div className='flex items-center'>
              <item.icon size={20} className='mr-6 border-1 border-solid border-[rgba(0,0,0,0.1)] text-[#333] rounded bg-white p-3' />
              <p>{item.title}</p>
            </div>
            {item.data}
          </div>
          {!item.disable && i < items.length - 1 && <hr className='border-none h-[1px] bg-[rgba(0,0,0,0.1)]' />}
        </React.Fragment>
      ))}
    </>
  )
}
