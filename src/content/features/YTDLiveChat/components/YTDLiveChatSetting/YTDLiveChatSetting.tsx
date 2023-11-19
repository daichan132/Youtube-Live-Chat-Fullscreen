import React, { useState } from 'react';
import styles from '../../styles/YTDLiveChatSetting/YTDLiveChatSetting.module.scss';
import { RiCloseLine } from 'react-icons/ri';
import classNames from 'classnames';
import { BgColorPicker } from './BgColorPicker';
import { BlurSlider } from './BlurSlider';
import { FontColorPicker } from './FontColorPicker';
import { AlwaysOnDisplaySwitch } from './AlwaysOnDisplaySwitch';
import { ReactionButtonDisplaySwitch } from './ReactionButtonDisplaySwitch';

interface YTDLiveChatSettingType {
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}
export const YTDLiveChatSetting = ({ setIsOpen }: YTDLiveChatSettingType) => {
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
          onClick={() => setIsOpen && setIsOpen(false)}
          size={24}
        />
      </div>
      <div className={styles['content']}>
        {item === 'General' ? (
          <>
            <div className={styles['content-item']}>
              <div>Always on Display</div>
              <AlwaysOnDisplaySwitch />
            </div>
            <hr />
          </>
        ) : null}
        {item === 'UI' ? (
          <>
            <div className={styles['content-item']}>
              <div>Background Color</div>
              <BgColorPicker />
            </div>
            <hr />
            <div className={styles['content-item']}>
              <div>Font Color</div>
              <FontColorPicker />
            </div>
            <hr />
            <div className={styles['content-item']}>
              <div>Blur</div>
              <BlurSlider />
            </div>
            <hr />
            <div className={styles['content-item']}>
              <div>Reaction Button</div>
              <ReactionButtonDisplaySwitch />
            </div>
            <hr />
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
