import classNames from 'classnames'
import React from 'react'
import { useTranslation } from 'react-i18next'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'
import { buildSettingItems, PRESET_ITEM_KEYS } from '../../utils/settingItemDefinitions'
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
  const items = buildSettingItems({
    t,
    keys: PRESET_ITEM_KEYS,
    dataByKey: {
      alwaysOnDisplay: <AlwaysOnDisplaySwitchUI alwaysOnDisplay={alwaysOnDisplay} />,
      chatOnlyDisplay: <ChatOnlyDisplaySwitchUI chatOnlyDisplay={chatOnlyDisplay} />,
      backgroundColor: <BgColorPickerUI rgba={bgColor} />,
      fontColor: <FontColorPickerUI rgba={fontColor} />,
      fontFamily: <FontFamilyInputUI value={fontFamily} />,
      fontSize: <FontSizeSliderUI value={fontSizeToSliderValue(fontSize)} />,
      blur: <BlurSliderUI value={BlurToSliderValue(blur)} />,
      space: <SpaceSliderUI value={spaceToSliderValue(space)} />,
      userNameDisplay: <UserNameDisplaySwitchUI userNameDisplay={userNameDisplay} />,
      userIconDisplay: <UserIconDisplaySwitchUI userIconDisplay={userIconDisplay} />,
      reactionButtonDisplay: <ReactionButtonDisplaySwitchUI reactionButtonDisplay={reactionButtonDisplay} />,
    },
    disableByKey: {
      chatOnlyDisplay: !alwaysOnDisplay,
    },
  })
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
