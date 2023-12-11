import React from 'react';

import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { FaRegUserCircle } from 'react-icons/fa';
import { IoChatbubbleEllipsesOutline, IoColorFillOutline, IoTimerOutline } from 'react-icons/io5';
import { MdBlurOn, MdExpand } from 'react-icons/md';
import { RiFontColor, RiFontFamily, RiFontSize2, RiUserLine } from 'react-icons/ri';
import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatStore } from '../../../../../stores';
import styles from '../../styles/YTDLiveChatSetting/YTDLiveChatSetting.module.scss';

import { AlwaysOnDisplaySwitch } from './YLCChangeItems/AlwaysOnDisplaySwitch';
import { BgColorPicker } from './YLCChangeItems/BgColorPicker';
import { BlurSlider } from './YLCChangeItems/BlurSlider';
import { ChatOnlyDisplaySwitch } from './YLCChangeItems/ChatOnlyDisplaySwitch';
import { FontColorPicker } from './YLCChangeItems/FontColorPicker';
import { FontFamilyInput } from './YLCChangeItems/FontFamilyInput';
import { FontSizeSlider } from './YLCChangeItems/FontSizeSlider';
import { SpaceSlider } from './YLCChangeItems/SpaceSlider';
import { UserIconDisplaySwitch } from './YLCChangeItems/UserIconDisplaySwitch';
import { UserNameDisplaySwitch } from './YLCChangeItems/UserNameDisplaySwitch';

import type { IconType } from 'react-icons';

interface itemType {
  icon: IconType;
  title: string;
  data: React.ReactNode;
  disable?: boolean;
}

export const UISettingContent = () => {
  const { alwaysOnDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({
      alwaysOnDisplay: state.alwaysOnDisplay,
    })),
  );
  const { t } = useTranslation();
  const items: itemType[] = [
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
  ];
  return (
    <>
      {items.map((item, i) => {
        return (
          <React.Fragment key={item.title}>
            <div className={classNames(styles['content-item'], item.disable && styles['disable'])}>
              <div className={styles['title-with-icon']}>
                {<item.icon size={20} />}
                <div>{item.title}</div>
              </div>
              {item.data}
            </div>
            {item.disable || i === items.length - 1 ? null : <hr />}
          </React.Fragment>
        );
      })}
    </>
  );
};
