import React, { useState } from 'react';
import styles from '../../styles/YTDLiveChatSetting/YTDLiveChatSetting.module.scss';
import { RiCloseLine, RiFontColor } from 'react-icons/ri';
import classNames from 'classnames';
import { BgColorPicker } from './BgColorPicker';
import { BlurSlider } from './BlurSlider';
import { FontColorPicker } from './FontColorPicker';
import { AlwaysOnDisplaySwitch } from './AlwaysOnDisplaySwitch';
import { ReactionButtonDisplaySwitch } from './ReactionButtonDisplaySwitch';
import { IoColorFillOutline, IoHeart, IoTimerOutline } from 'react-icons/io5';
import { MdBlurOn } from 'react-icons/md';

const generalItems = [
  {
    icon: <IoTimerOutline size={20} />,
    title: 'Always on Display',
    data: <AlwaysOnDisplaySwitch />,
  },
];
const uiItems = [
  {
    icon: <IoColorFillOutline size={20} />,
    title: 'Background Color',
    data: <BgColorPicker />,
  },
  {
    icon: <RiFontColor size={20} />,
    title: 'Font Color',
    data: <FontColorPicker />,
  },
  {
    icon: <MdBlurOn size={20} />,
    title: 'Blur',
    data: <BlurSlider />,
  },
  {
    icon: <IoHeart size={20} />,
    title: 'Reaction Button',
    data: <ReactionButtonDisplaySwitch />,
  },
];

interface YTDLiveChatSettingType {
  closeModal?: () => void;
}
export const YTDLiveChatSetting = ({ closeModal }: YTDLiveChatSettingType) => {
  const [item, setItem] = useState<string>('General');

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
        {item === 'General' ? (
          <>
            {generalItems.map((item) => {
              return (
                <>
                  <div className={styles['content-item']}>
                    <div className={styles['title-with-icon']}>
                      {item.icon}
                      <div>{item.title}</div>
                    </div>
                    {item.data}
                  </div>
                  <hr />
                </>
              );
            })}
          </>
        ) : null}
        {item === 'UI' ? (
          <>
            {uiItems.map((item) => {
              return (
                <>
                  <div className={styles['content-item']}>
                    <div className={styles['title-with-icon']}>
                      {item.icon}
                      <div>{item.title}</div>
                    </div>
                    {item.data}
                  </div>
                  <hr />
                </>
              );
            })}
          </>
        ) : null}
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
