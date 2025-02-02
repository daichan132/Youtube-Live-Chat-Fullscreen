import type { ComponentType } from 'react'

import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { RiCloseLine } from 'react-icons/ri'
import Modal from 'react-modal'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore } from '@/shared/stores'

import type { IconType } from 'react-icons'
import { BiSlider } from 'react-icons/bi'
import { HiOutlineCollection } from 'react-icons/hi'
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

  const tabs: { key: 'preset' | 'setting'; label: string; icon: IconType }[] = [
    { key: 'preset', label: t('content.setting.header.preset'), icon: HiOutlineCollection },
    { key: 'setting', label: t('content.setting.header.setting'), icon: BiSlider },
  ]

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
        <div className='flex justify-between items-center px-6 py-4 border-1 border-b-solid border-gray-200'>
          <div className='flex text-base gap-4'>
            {tabs.map(item => (
              <div
                key={item.key}
                className={classNames(
                  'px-5 py-4 rounded cursor-pointer transition-colors duration-200 flex items-center gap-4',
                  menuItem === item.key ? 'text-blue-700 bg-blue-100 cursor-default' : 'text-gray-700 hover:bg-gray-100',
                )}
                onClick={() => setMenuItem(item.key)}
                onKeyUp={e => e.key === 'Enter' && setMenuItem(item.key)}
              >
                <item.icon size={14} />
                {item.label}
              </div>
            ))}
          </div>
          <RiCloseLine
            className='cursor-pointer rounded p-3 transition-colors duration-200 hover:bg-gray-100'
            onClick={() => setIsOpenSettingModal(false)}
            size={20}
          />
        </div>
        <div className='flex-grow overflow-y-scroll h-[380px] shadow-inner p-3'>
          {menuItem === 'setting' && <SettingContent />}
          {menuItem === 'preset' && <PresetContent />}
        </div>
      </div>
    </ModalSafeForReact19>
  )
}
