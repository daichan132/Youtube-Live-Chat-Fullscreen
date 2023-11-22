import React from 'react';
import styles from '../../styles/YTDLiveChatSetting/YTDLiveChatSetting.module.scss';
import { RiCloseLine, RiFontColor, RiFontFamily, RiFontSize2, RiHeartLine } from 'react-icons/ri';
import classNames from 'classnames';
import { BgColorPicker } from './BgColorPicker';
import { BlurSlider } from './BlurSlider';
import { FontColorPicker } from './FontColorPicker';
import { AlwaysOnDisplaySwitch } from './AlwaysOnDisplaySwitch';
import { IoColorFillOutline, IoTimerOutline } from 'react-icons/io5';
import { MdBlurOn } from 'react-icons/md';
import { FontFamilyInput } from './FontFamilyInput';
import { IconType } from 'react-icons';
import { ReactionButtonDisplaySwitch } from './ReactionButtonDisplaySwitch';
import { useYTDLiveChatNoLsStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import { FontSizeSlider } from './FontSizeSlider';

interface itemType {
  icon: IconType;
  title: string;
  data: React.ReactNode;
}

const items: itemType[] = [
  {
    icon: IoTimerOutline,
    title: 'Always on Display',
    data: <AlwaysOnDisplaySwitch />,
  },
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
    icon: RiFontSize2,
    title: 'Font Size',
    data: <FontSizeSlider />,
  },
  {
    icon: MdBlurOn,
    title: 'Blur',
    data: <BlurSlider />,
  },
  {
    icon: RiHeartLine,
    title: 'Reaction Button',
    data: <ReactionButtonDisplaySwitch />,
  },
];

interface YTDLiveChatSettingType {
  closeModal?: () => void;
}
export const YTDLiveChatSetting = ({ closeModal }: YTDLiveChatSettingType) => {
  const { setIsOpenSettingModal } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      setIsOpenSettingModal: state.setIsOpenSettingModal,
    })),
  );
  return (
    <div className={styles['settings']}>
      <div className={styles['header']}>
        <div className={styles['menu']}>
          <div className={classNames(styles['menu-item'])}>Settings</div>
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
        <div className={styles['footer']}>
          <div className={styles['help']}>
            For instructions, click this{' '}
            <a
              href="https://smart-persimmon-6f9.notion.site/Chrome-extension-help-1606385e75a14d65ae4d0e42ba47fb84?pvs=4"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setIsOpenSettingModal(false);
              }}
            >
              Help
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
