import React from 'react';
import styles from '../../styles/YTDLiveChatSetting/YTDLiveChatSetting.module.scss';
import { RiCloseLine } from 'react-icons/ri';
import classNames from 'classnames';
import { useYTDLiveChatNoLsStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import Modal from 'react-modal';
import { useTranslation } from 'react-i18next';
import { UISettingContent } from './UISettingContent';

const customStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0)',
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

export const YTDLiveChatSetting = () => {
  const { isOpenSettingModal, setIsOpenSettingModal, setIsHover } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      isOpenSettingModal: state.isOpenSettingModal,
      setIsOpenSettingModal: state.setIsOpenSettingModal,
      setIsHover: state.setIsHover,
    })),
  );
  const { t } = useTranslation();

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
          <UISettingContent />
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
