import React, { useState } from 'react';
import styles from '../../styles/YTDLiveChatSetting/YTDLiveChatSetting.module.scss';
import { RiCloseLine, RiFontColor, RiFontFamily } from 'react-icons/ri';
import classNames from 'classnames';
import { BgColorPicker } from './BgColorPicker';
import { BlurSlider } from './BlurSlider';
import { FontColorPicker } from './FontColorPicker';
import { AlwaysOnDisplaySwitch } from './AlwaysOnDisplaySwitch';
import { IoColorFillOutline, IoTimerOutline } from 'react-icons/io5';
import { MdBlurOn } from 'react-icons/md';
import { FontFamilyInput } from './FontFamilyInput';
import { IconType } from 'react-icons';

interface itemType {
  icon: IconType;
  title: string;
  data: React.ReactNode;
}
const generalItems: itemType[] = [
  {
    icon: IoTimerOutline,
    title: 'Always on Display',
    data: <AlwaysOnDisplaySwitch />,
  },
];
const uiItems: itemType[] = [
  {
    icon: IoColorFillOutline,
    title: 'Background Color',
    data: <BgColorPicker />,
  },
  {
    icon: RiFontColor,
    title: 'Font Color',
    data: <FontColorPicker />,
  },
  {
    icon: RiFontFamily,
    title: 'Font Family',
    data: <FontFamilyInput />,
  },
  {
    icon: MdBlurOn,
    title: 'Blur',
    data: <BlurSlider />,
  },
  // {
  //   icon: RiHeartLine,
  //   title: 'Reaction Button',
  //   data: <ReactionButtonDisplaySwitch />,
  // },
];

interface YTDLiveChatSettingType {
  closeModal?: () => void;
}
export const YTDLiveChatSetting = ({ closeModal }: YTDLiveChatSettingType) => {
  const [item, setItem] = useState<string>('General');
  let items: itemType[] = [];
  if (item === 'General') {
    items = generalItems;
  } else if (item === 'UI') {
    items = uiItems;
  }

  return (
    <div className={styles['settings']}>
      <div className={styles['header']}>
        <div className={styles['menu']}>
          <MenuItem isActive={'General' === item} onClick={() => setItem('General')}>
            General
          </MenuItem>
          <MenuItem isActive={'UI' === item} onClick={() => setItem('UI')}>
            UI
          </MenuItem>
        </div>
        <RiCloseLine
          className={styles['close-button']}
          onClick={() => closeModal && closeModal()}
          size={20}
        />
      </div>
      <div className={styles['content']}>
        {items.map((item) => {
          return (
            <React.Fragment key={item.title}>
              <div className={styles['content-item']}>
                <div className={styles['title-with-icon']}>
                  {<item.icon size={20} />}
                  <div>{item.title}</div>
                </div>
                {item.data}
              </div>
              <hr />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const MenuItem = ({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={classNames(styles['menu-item'], isActive && styles['active'])}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
