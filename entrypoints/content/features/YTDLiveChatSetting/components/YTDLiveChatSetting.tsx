import classNames from 'classnames'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import type { IconType } from 'react-icons'
import { BiSlider } from 'react-icons/bi'
import { HiOutlineCollection } from 'react-icons/hi'
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
      <div className='flex flex-col w-[480px] rounded-xl bg-white text-black overflow-hidden border-2 border-solid border-gray-200'>
        <div className='flex justify-between items-center px-5 py-3 border-1 border-b-solid border-gray-100'>
          <div className='flex text-base gap-4'>
            {tabs.map(item => (
              <button
                key={item.key}
                type='button'
                className={classNames(
                  'px-3 py-3 cursor-pointer transition-colors duration-200 flex items-center gap-4',
                  menuItem === item.key
                    ? 'text-[#333] bg-gray-100 cursor-default border-b-solid border-b-1 border-gray-800 rounded-tl-md rounded-tr-md'
                    : 'text-gray-700 hover:bg-gray-100 rounded-md',
                )}
                onClick={() => setMenuItem(item.key)}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
          <RiCloseLine
            className='cursor-pointer rounded p-3 transition-colors duration-200 hover:bg-gray-100'
            onClick={() => setIsOpenSettingModal(false)}
            size={20}
          />
        </div>
        <div className='flex-grow overflow-y-scroll h-[380px] p-3 bg-gray-100'>
          {menuItem === 'setting' && <SettingContent />}
          {menuItem === 'preset' && <PresetContent />}
        </div>
        <div className='flex justify-end items-center px-7 py-6 border-t border-t-solid border-gray-200 bg-white text-xs'>
          <div className='flex gap-6'>
            <a
              href='https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd'
              target='_blank'
              rel='noopener noreferrer'
              className='text-gray-400 hover:text-gray-700 transition-colors'
            >
              {t('content.setting.footer.chrome')}
            </a>
            <a
              href='https://addons.mozilla.org/en-US/firefox/addon/youtube-live-chat-fullscreen/'
              target='_blank'
              rel='noopener noreferrer'
              className='text-gray-400 hover:text-gray-700 transition-colors'
            >
              {t('content.setting.footer.firefox')}
            </a>
            <a
              href='https://ko-fi.com/daichan132'
              target='_blank'
              rel='noopener noreferrer'
              className='text-gray-400 hover:text-gray-700 transition-colors'
            >
              {t('content.setting.footer.donate')}
            </a>
          </div>
        </div>
      </div>
    </ModalSafeForReact19>
  )
}
