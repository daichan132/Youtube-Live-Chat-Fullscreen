import React, { useState } from 'react';
import styles from '../../styles/YTDLiveChatSetting/YTDLiveChatSetting.module.scss';
import { RiCloseLine } from 'react-icons/ri';
import classNames from 'classnames';
import { CustomColorPicker } from './CustomColorPicker';

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
        {item === 'UI' ? (
          <>
            <div className={styles['content-item']}>
              <div style={{ marginBottom: 10, fontSize: 14 }}>Background Color</div>
              <div>
                <CustomColorPicker />
              </div>
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
