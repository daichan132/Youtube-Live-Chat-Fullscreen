import React from 'react';
import styles from '../../styles/YTDLiveChatSetting/YTDLiveChatSetting.module.scss';
import { RiCloseLine, RiFontColor, RiFontFamily, RiFontSize2, RiUserLine } from 'react-icons/ri';
import { FaRegUserCircle } from 'react-icons/fa';
import classNames from 'classnames';
import { BgColorPicker } from './YLCChangeItems/BgColorPicker';
import { BlurSlider } from './YLCChangeItems/BlurSlider';
import { FontColorPicker } from './YLCChangeItems/FontColorPicker';
import { AlwaysOnDisplaySwitch } from './YLCChangeItems/AlwaysOnDisplaySwitch';
import { IoChatbubbleEllipsesOutline, IoColorFillOutline, IoTimerOutline } from 'react-icons/io5';
import { MdBlurOn, MdExpand } from 'react-icons/md';
import { FontFamilyInput } from './YLCChangeItems/FontFamilyInput';
import { IconType } from 'react-icons';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import { FontSizeSlider } from './YLCChangeItems/FontSizeSlider';
import { SpaceSlider } from './YLCChangeItems/SpaceSlider';
import { UserNameDisplaySwitch } from './YLCChangeItems/UserNameDisplaySwitch';
import { ChatOnlyDisplaySwitch } from './YLCChangeItems/ChatOnlyDisplaySwitch';
import { useTranslation } from 'react-i18next';
import Modal from 'react-modal';
import { UserIconDisplaySwitch } from './YLCChangeItems/UserIconDisplaySwitch';

const customStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    padding: 0,
    outline: 'none',
    border: 'none',
    zIndex: 10,
    backgroundColor: 'transparent',
    overflow: 'none',
  },
};

interface itemType {
  icon: IconType;
  title: string;
  data: React.ReactNode;
  disable?: boolean;
}

export const YTDLiveChatSetting = () => {
  const { isOpenSettingModal, setIsOpenSettingModal, setIsHover } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      isOpenSettingModal: state.isOpenSettingModal,
      setIsOpenSettingModal: state.setIsOpenSettingModal,
      setIsHover: state.setIsHover,
    })),
  );
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
    <Modal
      closeTimeoutMS={200}
      isOpen={isOpenSettingModal}
      style={customStyles}
      shouldCloseOnOverlayClick={true}
      onRequestClose={() => setIsOpenSettingModal(false)}
      appElement={document.body}
      onAfterClose={() => setIsHover(false)}
    >
      <div className={styles['settings']}>
        <div className={styles['header']}>
          <div className={styles['menu']}>
            <div className={classNames(styles['menu-item'])}>{t('content.setting.header')}</div>
          </div>
          <RiCloseLine
            className={styles['close-button']}
            onClick={() => setIsOpenSettingModal(false)}
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
              {t('content.setting.footer')}
              <a
                href="https://smart-persimmon-6f9.notion.site/Chrome-extension-help-1606385e75a14d65ae4d0e42ba47fb84?pvs=4"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setIsOpenSettingModal(false);
                }}
              >
                {t('content.setting.help')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
