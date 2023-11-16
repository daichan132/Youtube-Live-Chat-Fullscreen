import React from 'react';
import { ChromePicker } from 'react-color';
import styles from '../../styles/YTDLiveChatSetting/YTDLiveChatSetting.module.scss';
import { RiCloseLine } from 'react-icons/ri';
import { useYlcBgColorChange } from '../../hooks/useYlcBgColorChange';
import classNames from 'classnames';

interface YTDLiveChatSettingType {
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}
export const YTDLiveChatSetting = ({ setIsOpen }: YTDLiveChatSettingType) => {
  const { color, changeColor } = useYlcBgColorChange();

  return (
    <div className={styles['settings']}>
      <div className={styles['header']}>
        <div className={styles['menu']}>
          <div className={classNames(styles['menu-item'], styles['active'])}>General</div>
          <div className={classNames(styles['menu-item'])}>UI</div>
        </div>
        <RiCloseLine
          className={styles['close-button']}
          onClick={() => setIsOpen && setIsOpen(false)}
          size={24}
        />
      </div>
      <div className={styles['content']}>
        <div className={styles['content-item']}>
          <div>Background Color</div>
          <div>
            <ChromePicker
              color={color}
              onChange={changeColor}
              styles={{
                default: {
                  picker: {
                    boxShadow: 'none',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                  },
                },
              }}
            />
          </div>
        </div>
        <hr />
      </div>
    </div>
  );
};
