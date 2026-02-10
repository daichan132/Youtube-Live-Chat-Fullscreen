import classNames from 'classnames'
import { type ComponentType, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { IconType } from 'react-icons'
import { RiCloseLine } from 'react-icons/ri'
import { TbLayoutGrid, TbSettings2 } from 'react-icons/tb'
import Modal from 'react-modal'
import { useShallow } from 'zustand/react/shallow'
import { useGlobalSettingStore, useYTDLiveChatNoLsStore } from '@/shared/stores'
import { useResolvedThemeMode } from '@/shared/theme'
import { getModalParentElement } from '../utils/getModalParentElement'
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
  const themeMode = useGlobalSettingStore(state => state.themeMode)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)
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
    { key: 'preset', label: t('content.setting.header.preset'), icon: TbLayoutGrid },
    { key: 'setting', label: t('content.setting.header.setting'), icon: TbSettings2 },
  ]

  useEffect(() => {
    if (!isOpenSettingModal) return

    const modalParent = getModalParentElement()
    modalParent.setAttribute('data-ylc-theme', resolvedThemeMode)
  }, [isOpenSettingModal, resolvedThemeMode])

  return (
    <ModalSafeForReact19
      isOpen={isOpenSettingModal}
      style={customStyles}
      shouldCloseOnOverlayClick={true}
      onRequestClose={() => setIsOpenSettingModal(false)}
      onAfterClose={() => setIsHover(false)}
      appElement={document.body}
      parentSelector={getModalParentElement}
    >
      <div
        data-ylc-theme={resolvedThemeMode}
        className='flex flex-col w-[480px] rounded-xl ylc-theme-surface ylc-theme-shadow-md overflow-hidden border border-solid ylc-theme-border'
        onWheel={e => e.stopPropagation()}
      >
        <div className='flex justify-between items-center px-2 py-1.5'>
          <div className='ylc-theme-tablist'>
            {tabs.map(item => (
              <button
                key={item.key}
                type='button'
                className={classNames('ylc-theme-tab ylc-theme-focus-ring-soft', menuItem === item.key && 'ylc-theme-tab-active')}
                onClick={() => {
                  if (menuItem === item.key) return
                  setMenuItem(item.key)
                }}
                aria-pressed={menuItem === item.key}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </div>
          <div className='flex items-center'>
            <RiCloseLine
              className='cursor-pointer rounded-md p-2 transition-colors duration-200 ylc-theme-elevated ylc-theme-text-secondary hover:text-[var(--ylc-text-primary)] hover:bg-[var(--ylc-hover-surface)]'
              onClick={() => setIsOpenSettingModal(false)}
              size={22}
            />
          </div>
        </div>
        <div
          className='flex-grow overflow-y-scroll h-[380px] ylc-theme-surface-muted p-2 rounded-2xl'
          style={{ overscrollBehavior: 'contain' }}
        >
          {menuItem === 'setting' && <SettingContent />}
          {menuItem === 'preset' && <PresetContent />}
        </div>
        <div className='flex justify-end items-center px-3 py-2 ylc-theme-surface text-xs'>
          <div className='flex gap-4'>
            <a
              href='https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd'
              target='_blank'
              rel='noopener noreferrer'
              className='ylc-theme-text-muted hover:text-[var(--ylc-text-primary)] transition-colors'
            >
              {t('content.setting.footer.chrome')}
            </a>
            <a
              href='https://addons.mozilla.org/en-US/firefox/addon/youtube-live-chat-fullscreen/'
              target='_blank'
              rel='noopener noreferrer'
              className='ylc-theme-text-muted hover:text-[var(--ylc-text-primary)] transition-colors'
            >
              {t('content.setting.footer.firefox')}
            </a>
            <a
              href='https://github.com/daichan132/Youtube-Live-Chat-Fullscreen'
              target='_blank'
              rel='noopener noreferrer'
              className='ylc-theme-text-muted hover:text-[var(--ylc-text-primary)] transition-colors'
            >
              GitHub
            </a>
            <a
              href='https://ko-fi.com/daichan132'
              target='_blank'
              rel='noopener noreferrer'
              className='ylc-theme-text-muted hover:text-[var(--ylc-text-primary)] transition-colors'
            >
              {t('content.setting.footer.donate')}
            </a>
          </div>
        </div>
      </div>
    </ModalSafeForReact19>
  )
}
