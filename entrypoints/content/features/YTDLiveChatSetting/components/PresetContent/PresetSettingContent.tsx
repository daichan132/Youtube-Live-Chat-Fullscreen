import React from 'react'
import { useTranslation } from 'react-i18next'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'
import { cn } from '@/shared/utils/cn'
import { buildSettingItems, PRESET_ITEM_KEYS } from '../../utils/settingItemDefinitions'
import { AlwaysOnDisplaySwitchUI } from '../YLCChangeItems/AlwaysOnDisplaySwitch'
import { BgColorPickerUI } from '../YLCChangeItems/BgColorPicker'
import { BlurSliderUI, BlurToSliderValue } from '../YLCChangeItems/BlurSlider'
import { ChatOnlyDisplaySwitchUI } from '../YLCChangeItems/ChatOnlyDisplaySwitch'
import { FontColorPickerUI } from '../YLCChangeItems/FontColorPicker'
import { FontFamilyInputUI } from '../YLCChangeItems/FontFamilyInput'
import { FontSizeSliderUI, fontSizeToSliderValue } from '../YLCChangeItems/FontSizeSlider'
import { SpaceSliderUI, spaceToSliderValue } from '../YLCChangeItems/SpaceSlider'
import { UserIconDisplaySwitchUI } from '../YLCChangeItems/UserIconDisplaySwitch'
import { UserNameDisplaySwitchUI } from '../YLCChangeItems/UserNameDisplaySwitch'

export const PresetSettingContent = ({ ylcStyle, isOpen }: { ylcStyle: YLCStyleType; isOpen: boolean }) => {
  const { t } = useTranslation()
  const { alwaysOnDisplay, chatOnlyDisplay, bgColor, fontColor, fontFamily, fontSize, blur, space, userNameDisplay, userIconDisplay } =
    ylcStyle
  const items = buildSettingItems({
    t,
    keys: PRESET_ITEM_KEYS,
    dataByKey: {
      alwaysOnDisplay: <AlwaysOnDisplaySwitchUI alwaysOnDisplay={alwaysOnDisplay} />,
      chatOnlyDisplay: <ChatOnlyDisplaySwitchUI chatOnlyDisplay={chatOnlyDisplay} />,
      backgroundColor: <BgColorPickerUI rgba={bgColor} />,
      fontColor: <FontColorPickerUI rgba={fontColor} />,
      fontFamily: <FontFamilyInputUI value={fontFamily} readOnly />,
      fontSize: <FontSizeSliderUI value={fontSizeToSliderValue(fontSize)} />,
      blur: <BlurSliderUI value={BlurToSliderValue(blur)} />,
      space: <SpaceSliderUI value={spaceToSliderValue(space)} />,
      userNameDisplay: <UserNameDisplaySwitchUI userNameDisplay={userNameDisplay} />,
      userIconDisplay: <UserIconDisplaySwitchUI userIconDisplay={userIconDisplay} />,
    },
    disableByKey: {
      chatOnlyDisplay: !alwaysOnDisplay,
    },
  })
  return (
    <div className={cn('flex flex-col p-4 gap-y-4 transition-all ylc-theme-text-primary', isOpen && 'opacity-100')}>
      <div className='flex flex-col gap-y-2'>
        <div className='text-lg font-bold ylc-theme-text-primary'>Setting (View Only)</div>
        <div>
          {items.map((item, i) => {
            return (
              <React.Fragment key={item.title}>
                <div
                  className={cn(
                    'flex flex-wrap items-center justify-between py-2 ylc-theme-text-primary',
                    !item.disable && 'rounded-lg',
                    item.disable && 'opacity-50 pointer-events-none',
                  )}
                >
                  <div className='flex items-center gap-x-3'>
                    <span className='ylc-theme-icon-badge ylc-theme-icon-badge-sm' aria-hidden='true'>
                      <item.icon size={16} />
                    </span>
                    <div>{item.title}</div>
                  </div>
                  <div className={cn('ylc-action-slot ylc-action-slot-setting', item.actionWidth === 'wide' && 'ylc-action-slot-wide')}>
                    <div className='ylc-action-inner'>{item.data}</div>
                  </div>
                </div>
                {item.disable || i === items.length - 1 ? null : <hr className='border-none ylc-theme-divider' />}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
