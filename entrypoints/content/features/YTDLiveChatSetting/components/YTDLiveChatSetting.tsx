import type { ComponentType } from 'react'

import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { RiCloseLine } from 'react-icons/ri'
import Modal from 'react-modal'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore } from '@/shared/stores'

import { PresetContent } from './PresetContent'
import { SettingContent } from './SettingContent'

const ModalSafeForReact19 = Modal as ComponentType<ReactModal['props']>

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
    <ModalSafeForReact19
      isOpen={isOpenSettingModal}
      style={customStyles}
      shouldCloseOnOverlayClick={true}
      onRequestClose={() => setIsOpenSettingModal(false)}
      onAfterClose={() => setIsHover(false)}
      appElement={document.body}
      parentSelector={() => (document.getElementById('shadow-root-live-chat')?.shadowRoot as unknown as HTMLElement) || document.body}
    >
      <div className='flex flex-col w-[480px] rounded-lg bg-white text-black overflow-hidden border-1 border-solid border-gray-200'>
        <div className='flex justify-between items-center p-4 border-1 border-b-solid border-gray-200'>
          <div className='flex text-base gap-3'>
            <div
              className={classNames(
                'px-5 py-4 rounded cursor-pointer transition-colors duration-200',
                menuItem === 'preset' ? 'text-blue-500 bg-blue-100 cursor-default' : 'text-gray-700 hover:bg-gray-100',
              )}
              onClick={() => setMenuItem('preset')}
              onKeyUp={e => e.key === 'Enter' && setMenuItem('preset')}
            >
              {t('content.setting.header.preset')}
            </div>
            <div
              className={classNames(
                'px-5 py-4 rounded cursor-pointer transition-colors duration-200',
                menuItem === 'setting' ? 'text-blue-500 bg-blue-100 cursor-default' : 'text-gray-700 hover:bg-gray-100',
              )}
              onClick={() => setMenuItem('setting')}
              onKeyUp={e => e.key === 'Enter' && setMenuItem('setting')}
            >
              {t('content.setting.header.setting')}
            </div>
          </div>
          <RiCloseLine
            className='cursor-pointer rounded p-3 transition-colors duration-200 hover:bg-gray-100'
            onClick={() => setIsOpenSettingModal(false)}
            size={20}
          />
        </div>
        <div className='flex-grow overflow-y-scroll h-[400px] text-lg shadow-inner'>
          <div className='flex-grow'>
            {menuItem === 'setting' && <SettingContent />}
            {menuItem === 'preset' && <PresetContent />}
          </div>
          <div className='border-1 border-t-solid border-gray-200 p-5 flex justify-end'>
            <div className='text-gray-700'>
              {t('content.setting.footer')}
              <a
                href='https://smart-persimmon-6f9.notion.site/Chrome-extension-help-1606385e75a14d65ae4d0e42ba47fb84?pvs=4'
                target='_blank'
                rel='noopener noreferrer'
                onClick={() => {
                  setIsOpenSettingModal(false)
                }}
                className='text-gray-700 underline'
              >
                {t('content.setting.help')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </ModalSafeForReact19>
  )
}
