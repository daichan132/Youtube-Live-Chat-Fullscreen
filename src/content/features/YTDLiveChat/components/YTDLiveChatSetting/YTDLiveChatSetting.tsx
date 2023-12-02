import React from 'react';
import styles from '../../styles/YTDLiveChatSetting/YTDLiveChatSetting.module.scss';
import { RiCloseLine, RiFontColor, RiFontFamily, RiFontSize2, RiUserLine } from 'react-icons/ri';
import classNames from 'classnames';
import { BgColorPicker } from './YLCChangeItems/BgColorPicker';
import { BlurSlider } from './YLCChangeItems/BlurSlider';
import { FontColorPicker } from './YLCChangeItems/FontColorPicker';
import { AlwaysOnDisplaySwitch } from './YLCChangeItems/AlwaysOnDisplaySwitch';
import { IoChatbubbleEllipsesOutline, IoColorFillOutline, IoTimerOutline } from 'react-icons/io5';
import { MdBlurOn, MdExpand } from 'react-icons/md';
import { FontFamilyInput } from './YLCChangeItems/FontFamilyInput';
import { IconType } from 'react-icons';
// import { ReactionButtonDisplaySwitch } from './ReactionButtonDisplaySwitch';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import { FontSizeSlider } from './YLCChangeItems/FontSizeSlider';
import { SpaceSlider } from './YLCChangeItems/SpaceSlider';
import { UserNameDisplaySwitch } from './YLCChangeItems/UserNameDisplaySwitch';
import { ChatOnlyDisplaySwitch } from './YLCChangeItems/ChatOnlyDisplaySwitch';

interface itemType {
  icon: IconType;
  title: string;
  data: React.ReactNode;
  disable?: boolean;
}

interface YTDLiveChatSettingType {
  closeModal?: () => void;
}
export const YTDLiveChatSetting = ({ closeModal }: YTDLiveChatSettingType) => {
  const { setIsOpenSettingModal } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      setIsOpenSettingModal: state.setIsOpenSettingModal,
    })),
  );
  const { alwaysOnDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({
      alwaysOnDisplay: state.alwaysOnDisplay,
    })),
  );

  const items: itemType[] = [
    {
      icon: IoTimerOutline,
      title: 'Always on Display',
      data: <AlwaysOnDisplaySwitch />,
    },
    {
      icon: IoChatbubbleEllipsesOutline,
      title: 'Chat Only Display',
      data: <ChatOnlyDisplaySwitch />,
      disable: !alwaysOnDisplay,
    },
    {
      icon: RiUserLine,
      title: 'User Name Display',
      data: <UserNameDisplaySwitch />,
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
      icon: MdExpand,
      title: 'Space',
      data: <SpaceSlider />,
    },
  ];

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
        {items.map((item, i) => {
          return (
            <React.Fragment key={item.title}>
              <div
                className={classNames(styles['content-item'], item.disable && styles['disable'])}
              >
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
