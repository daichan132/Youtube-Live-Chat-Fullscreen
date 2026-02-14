import classNames from 'classnames'
import { type ComponentType, useCallback, useEffect, useMemo, useRef } from 'react'
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
  const tablistRef = useRef<HTMLDivElement>(null)

  const tabs = useMemo<{ key: 'preset' | 'setting'; label: string; icon: IconType }[]>(() => [
    { key: 'preset', label: t('content.setting.header.preset'), icon: TbLayoutGrid },
    { key: 'setting', label: t('content.setting.header.setting'), icon: TbSettings2 },
  ], [t])

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = tabs.findIndex(tab => tab.key === menuItem)
      let nextIndex: number | null = null
      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % tabs.length
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
      }
      if (nextIndex !== null) {
        e.preventDefault()
        setMenuItem(tabs[nextIndex].key)
        const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        buttons?.[nextIndex]?.focus()
      }
    },
    [menuItem, setMenuItem, tabs],
  )

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
        className='ylc-setting-panel flex flex-col w-[480px] rounded-xl ylc-theme-glass-panel ylc-theme-shadow-md overflow-hidden border border-solid ylc-theme-border'
        onWheel={e => e.stopPropagation()}
      >
        <div className='ylc-theme-setting-header flex justify-between items-center px-2 py-1.5'>
          <div ref={tablistRef} className='ylc-theme-tablist' role='tablist'>
            {tabs.map(item => (
              <button
                key={item.key}
                id={`ylc-tab-${item.key}`}
                type='button'
                role='tab'
                aria-selected={menuItem === item.key}
                aria-controls={`ylc-tabpanel-${item.key}`}
                tabIndex={menuItem === item.key ? 0 : -1}
                className={classNames('ylc-theme-tab ylc-theme-focus-ring-soft', menuItem === item.key && 'ylc-theme-tab-active')}
                onClick={() => {
                  if (menuItem === item.key) return
                  setMenuItem(item.key)
                }}
                onKeyDown={handleTabKeyDown}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </div>
          <button
            type='button'
            aria-label='Close'
            className='ylc-setting-close-button inline-flex items-center justify-center w-[40px] h-[40px] p-[8px] cursor-pointer rounded-md border-none bg-transparent transition-colors duration-160 ylc-theme-focus-ring-soft ylc-theme-text-secondary hover:text-[var(--ylc-text-primary)]'
            onClick={() => setIsOpenSettingModal(false)}
          >
            <RiCloseLine size={24} />
          </button>
        </div>
        <div
          id={`ylc-tabpanel-${menuItem}`}
          role='tabpanel'
          aria-labelledby={`ylc-tab-${menuItem}`}
          className='flex-grow overflow-y-scroll h-[380px] p-2 rounded-2xl'
          style={{ overscrollBehavior: 'contain' }}
        >
          {menuItem === 'setting' && <SettingContent />}
          {menuItem === 'preset' && <PresetContent />}
        </div>
        <div className='ylc-theme-setting-footer flex justify-end items-center px-3 py-2.5'>
          <div className='ylc-theme-footer-links'>
            <a
              href='https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd'
              target='_blank'
              rel='noopener noreferrer'
              className='ylc-theme-footer-link'
            >
              {t('content.setting.footer.chrome')}
            </a>
            <a
              href='https://addons.mozilla.org/en-US/firefox/addon/youtube-live-chat-fullscreen/'
              target='_blank'
              rel='noopener noreferrer'
              className='ylc-theme-footer-link'
            >
              {t('content.setting.footer.firefox')}
            </a>
            <a
              href='https://github.com/daichan132/Youtube-Live-Chat-Fullscreen'
              target='_blank'
              rel='noopener noreferrer'
              className='ylc-theme-footer-link'
            >
              GitHub
            </a>
            <a href='https://ko-fi.com/daichan132' target='_blank' rel='noopener noreferrer' className='ylc-theme-footer-link'>
              {t('content.setting.footer.donate')}
            </a>
          </div>
        </div>
      </div>
    </ModalSafeForReact19>
  )
}
