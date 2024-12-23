import React from 'react'

import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { RiCloseLine } from 'react-icons/ri'
import Modal from 'react-modal'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import styles from '../styles/YTDLiveChatSetting.module.css'

import { PresetContent } from './PresetContent'
import { SettingContent } from './SettingContent'

const customStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0)',
    zIndex: 1000000,
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
    backgroundColor: 'transparent',
    overflow: 'none',
  },
}

export const YTDLiveChatSetting = () => {
  const { isOpenSettingModal, menuItem, setMenuItem, setIsOpenSettingModal, setIsHover } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      isOpenSettingModal: state.isOpenSettingModal,
      menuItem: state.menuItem,
      setMenuItem: state.setMenuItem,
      setIsOpenSettingModal: state.setIsOpenSettingModal,
      setIsHover: state.setIsHover,
    })),
  )
  const { t } = useTranslation()

  return (
    <Modal
      closeTimeoutMS={200}
      isOpen={isOpenSettingModal}
      style={customStyles}
      shouldCloseOnOverlayClick={true}
      onRequestClose={() => setIsOpenSettingModal(false)}
      onAfterClose={() => setIsHover(false)}
      parentSelector={() => document.getElementById('movie_player') || document.body}
    >
      <div className={styles.settings}>
        <div className={styles.header}>
          <div className={styles.menu}>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
            <div
              className={classNames(styles['menu-item'], menuItem === 'preset' && styles['selected-menu-item'])}
              onClick={() => setMenuItem('preset')}
            >
              {t('content.setting.header.preset')}
            </div>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
            <div
              className={classNames(styles['menu-item'], menuItem === 'setting' && styles['selected-menu-item'])}
              onClick={() => setMenuItem('setting')}
            >
              {t('content.setting.header.setting')}
            </div>
          </div>
          <RiCloseLine className={styles['close-button']} onClick={() => setIsOpenSettingModal(false)} size={20} />
        </div>
        <div className={styles.content}>
          {menuItem === 'setting' && <SettingContent />}
          {menuItem === 'preset' && <PresetContent />}
          <div className={styles.footer}>
            <div className={styles.help}>
              {t('content.setting.footer')}
              <a
                href='https://smart-persimmon-6f9.notion.site/Chrome-extension-help-1606385e75a14d65ae4d0e42ba47fb84?pvs=4'
                target='_blank'
                rel='noopener noreferrer'
                onClick={() => {
                  setIsOpenSettingModal(false)
                }}
              >
                {t('content.setting.help')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
