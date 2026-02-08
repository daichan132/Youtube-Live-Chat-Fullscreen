import classNames from 'classnames'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useYTDLiveChatStore } from '@/shared/stores'
import { buildSettingItems, SETTING_ITEM_KEYS } from '../utils/settingItemDefinitions'
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
  const items = buildSettingItems({
    t,
    keys: SETTING_ITEM_KEYS,
    dataByKey: {
      alwaysOnDisplay: <AlwaysOnDisplaySwitch />,
      chatOnlyDisplay: <ChatOnlyDisplaySwitch />,
      backgroundColor: <BgColorPicker />,
      fontColor: <FontColorPicker />,
      fontFamily: <FontFamilyInput />,
      fontSize: <FontSizeSlider />,
      blur: <BlurSlider />,
      space: <SpaceSlider />,
      userNameDisplay: <UserNameDisplaySwitch />,
      userIconDisplay: <UserIconDisplaySwitch />,
      superChatBarDisplay: <SuperChatBarDisplaySwitch />,
    },
    disableByKey: {
      chatOnlyDisplay: !alwaysOnDisplay,
    },
  })
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
