import classNames from 'classnames'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { FaRegUserCircle } from 'react-icons/fa'
import { IoChatbubbleEllipsesOutline, IoColorFillOutline, IoTimerOutline } from 'react-icons/io5'
import { MdBlurOn, MdExpand } from 'react-icons/md'
import { RiFontColor, RiFontFamily, RiFontSize2, RiHeartFill, RiUserLine } from 'react-icons/ri'
import type { SettingItemType } from '@/shared/types/ytdLiveChatSetting'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'
import { AlwaysOnDisplaySwitchUI } from '../YLCChangeItems/AlwaysOnDisplaySwitch'
import { BgColorPickerUI } from '../YLCChangeItems/BgColorPicker'
import { BlurSliderUI, BlurToSliderValue } from '../YLCChangeItems/BlurSlider'
import { ChatOnlyDisplaySwitchUI } from '../YLCChangeItems/ChatOnlyDisplaySwitch'
import { FontColorPickerUI } from '../YLCChangeItems/FontColorPicker'
import { FontFamilyInputUI } from '../YLCChangeItems/FontFamilyInput'
import { FontSizeSliderUI, fontSizeToSliderValue } from '../YLCChangeItems/FontSizeSlider'
import { ReactionButtonDisplaySwitchUI } from '../YLCChangeItems/ReactionButtonDisplay'
import { SpaceSliderUI, spaceToSliderValue } from '../YLCChangeItems/SpaceSlider'
import { UserIconDisplaySwitchUI } from '../YLCChangeItems/UserIconDisplaySwitch'
import { UserNameDisplaySwitchUI } from '../YLCChangeItems/UserNameDisplaySwitch'

export const PresetSettingContent = ({ ylcStyle, isOpen }: { ylcStyle: YLCStyleType; isOpen: boolean }) => {
  const { t } = useTranslation()
  const {
    alwaysOnDisplay,
    chatOnlyDisplay,
    bgColor,
    fontColor,
    fontFamily,
    fontSize,
    blur,
    space,
    userNameDisplay,
    userIconDisplay,
    reactionButtonDisplay,
  } = ylcStyle
  const items: SettingItemType[] = [
    {
      icon: IoTimerOutline,
      title: t('content.setting.alwaysOnDisplay'),
      data: <AlwaysOnDisplaySwitchUI alwaysOnDisplay={alwaysOnDisplay} />,
    },
    {
      icon: IoChatbubbleEllipsesOutline,
      title: t('content.setting.chatOnlyDisplay'),
      data: <ChatOnlyDisplaySwitchUI chatOnlyDisplay={chatOnlyDisplay} />,
      disable: !alwaysOnDisplay,
    },
    {
      icon: IoColorFillOutline,
      title: t('content.setting.backgroundColor'),
      data: <BgColorPickerUI rgba={bgColor} />,
    },
    {
      icon: RiFontColor,
      title: t('content.setting.fontColor'),
      data: <FontColorPickerUI rgba={fontColor} />,
    },
    {
      icon: RiFontFamily,
      title: t('content.setting.fontFamily'),
      data: <FontFamilyInputUI value={fontFamily} />,
    },
    {
      icon: RiFontSize2,
      title: t('content.setting.fontSize'),
      data: <FontSizeSliderUI value={fontSizeToSliderValue(fontSize)} />,
    },
    {
      icon: MdBlurOn,
      title: t('content.setting.blur'),
      data: <BlurSliderUI value={BlurToSliderValue(blur)} />,
    },
    {
      icon: MdExpand,
      title: t('content.setting.space'),
      data: <SpaceSliderUI value={spaceToSliderValue(space)} />,
    },
    {
      icon: RiUserLine,
      title: t('content.setting.userNameDisplay'),
      data: <UserNameDisplaySwitchUI userNameDisplay={userNameDisplay} />,
    },
    {
      icon: FaRegUserCircle,
      title: t('content.setting.userIconDisplay'),
      data: <UserIconDisplaySwitchUI userIconDisplay={userIconDisplay} />,
    },
    {
      icon: RiHeartFill,
      title: t('content.setting.reactionButtonDisplay'),
      data: <ReactionButtonDisplaySwitchUI reactionButtonDisplay={reactionButtonDisplay} />,
    },
  ]
  return (
    <div className={classNames('flex flex-col p-4 gap-y-4 transition-all', isOpen && 'opacity-100')}>
      <div className='flex flex-col gap-y-2'>
        <div className='text-lg font-bold'>Setting (View Only)</div>
        <div>
          {items.map((item, i) => {
            return (
              <React.Fragment key={item.title}>
                <div className={classNames('flex items-center justify-between py-2', item.disable && 'opacity-50 pointer-events-none')}>
                  <div className='flex items-center gap-x-2'>
                    {<item.icon size={16} />}
                    <div>{item.title}</div>
                  </div>
                  <div className='ml-auto'>{item.data}</div>
                </div>
                {item.disable || i === items.length - 1 ? null : <hr />}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
