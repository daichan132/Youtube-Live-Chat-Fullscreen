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
import { useTranslation } from 'react-i18next';

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
    <div className={styles['settings']}>
      <div className={styles['header']}>
        <div className={styles['menu']}>
          <div className={classNames(styles['menu-item'])}>{t('content.setting.header')}</div>
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
  );
};
