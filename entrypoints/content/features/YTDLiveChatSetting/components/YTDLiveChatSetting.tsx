import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type IconType,
  RiCloseLine,
  TbArrowBackUp,
  TbArrowForwardUp,
  TbBrandGithub,
  TbHeart,
  TbLayoutGrid,
  TbSettings2,
} from '@/shared/components/icons'
import { Modal } from '@/shared/components/Modal'
import { useLocaleDirection, useT } from '@/shared/i18n/react'
import { canRedoAtom, canUndoAtom, themeModeAtom } from '@/shared/state'
import { useResolvedThemeMode } from '@/shared/theme'
import { cn } from '@/shared/utils/cn'
import { useStyleHistoryCommands } from '../styleHistoryCommands'
import { getModalParentElement } from '../utils/getModalParentElement'
import { PresetContent } from './PresetContent'
import { SettingContent } from './SettingContent'

type YTDLiveChatSettingProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  diagnostics?: React.ReactNode
}

export const YTDLiveChatSetting = ({ open, onOpenChange, diagnostics }: YTDLiveChatSettingProps) => {
  const themeMode = useAtomValue(themeModeAtom)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)
  const [menuItem, setMenuItem] = useState<'setting' | 'preset'>('setting')
  const t = useT()
  const direction = useLocaleDirection()
  const tablistRef = useRef<HTMLDivElement>(null)
  const [historyAnnouncement, setHistoryAnnouncement] = useState({ message: '', sequence: 0 })
  const canUndo = useAtomValue(canUndoAtom)
  const canRedo = useAtomValue(canRedoAtom)
  const { finishYLCStyleGesture, redoYLCStyle, undoYLCStyle } = useStyleHistoryCommands()

  const focusActiveTab = useCallback(() => {
    const activeTab = tablistRef.current?.querySelector<HTMLButtonElement>('[role="tab"][tabindex="0"]')
    activeTab?.focus({ preventScroll: true })
  }, [])

  const tabs = useMemo<{ key: 'preset' | 'setting'; label: string; icon: IconType }[]>(
    () => [
      { key: 'setting', label: t('content.setting.header.setting'), icon: TbSettings2 },
      { key: 'preset', label: t('content.setting.header.preset'), icon: TbLayoutGrid },
    ],
    [t],
  )

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
        const nextTab = tabs[nextIndex]
        if (!nextTab) return
        e.preventDefault()
        setMenuItem(nextTab.key)
        const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        buttons?.[nextIndex]?.focus()
      }
    },
    [menuItem, setMenuItem, tabs],
  )

  useEffect(() => {
    if (!open) return

    const modalParent = getModalParentElement()
    modalParent.setAttribute('data-ylc-theme', resolvedThemeMode)
  }, [open, resolvedThemeMode])

  useEffect(() => {
    if (!open) {
      finishYLCStyleGesture()
    }
  }, [open])

  const handleUndo = useCallback(() => {
    const handled = undoYLCStyle()
    if (handled) {
      setHistoryAnnouncement(current => ({
        message: t('content.setting.header.undo'),
        sequence: current.sequence + 1,
      }))
    }
    return handled
  }, [t])

  const handleRedo = useCallback(() => {
    const handled = redoYLCStyle()
    if (handled) {
      setHistoryAnnouncement(current => ({
        message: t('content.setting.header.redo'),
        sequence: current.sequence + 1,
      }))
    }
    return handled
  }, [t])

  const handlePanelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.altKey || event.nativeEvent.isComposing) return

      const path = event.nativeEvent.composedPath()
      const isTextEditing = path.some(target => {
        if (!(target instanceof HTMLElement)) return false
        if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true
        if (!(target instanceof HTMLInputElement)) return false
        return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(target.type)
      })
      if (isTextEditing) return

      const hasCommandModifier = event.metaKey !== event.ctrlKey && (event.metaKey || event.ctrlKey)
      if (!hasCommandModifier) return

      const key = event.key.toLowerCase()
      const isUndo = key === 'z' && !event.shiftKey
      const isRedo = (key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey)
      if (!isUndo && !isRedo) return

      event.preventDefault()
      event.stopPropagation()
      if (isUndo) {
        handleUndo()
      } else {
        handleRedo()
      }
    },
    [handleRedo, handleUndo],
  )

  return (
    <Modal
      isOpen={open}
      shouldFocusAfterRender={false}
      shouldCloseOnOverlayClick={true}
      shouldReturnFocusAfterClose={false}
      onRequestClose={() => onOpenChange(false)}
      onAfterOpen={focusActiveTab}
      parentSelector={getModalParentElement}
    >
      <div
        data-ylc-theme={resolvedThemeMode}
        dir={direction}
        className='ylc-setting-panel flex flex-col w-[460px] rounded-xl ylc-theme-surface ylc-theme-shadow-md overflow-hidden border border-solid ylc-theme-border'
        onWheel={e => e.stopPropagation()}
        onKeyDownCapture={handlePanelKeyDown}
      >
        <header className='ylc-theme-setting-header flex justify-between items-stretch min-h-[48px]'>
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
                className={cn('ylc-theme-tab ylc-theme-focus-ring-soft', menuItem === item.key && 'ylc-theme-tab-active')}
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
          <div className='self-center inline-flex items-center gap-0.5'>
            <button
              type='button'
              aria-label={t('content.setting.header.undo')}
              aria-keyshortcuts='Meta+Z Control+Z'
              disabled={!canUndo}
              className='ylc-setting-history-button inline-flex items-center justify-center w-[36px] h-[36px] p-[8px] cursor-pointer rounded-md border-none bg-transparent transition-colors duration-160 ylc-theme-focus-ring-soft ylc-theme-text-secondary hover:text-[var(--ylc-text-primary)] disabled:opacity-35 disabled:cursor-not-allowed'
              onClick={handleUndo}
            >
              <TbArrowBackUp size={20} />
            </button>
            <button
              type='button'
              aria-label={t('content.setting.header.redo')}
              aria-keyshortcuts='Meta+Shift+Z Control+Shift+Z Control+Y'
              disabled={!canRedo}
              className='ylc-setting-history-button inline-flex items-center justify-center w-[36px] h-[36px] p-[8px] cursor-pointer rounded-md border-none bg-transparent transition-colors duration-160 ylc-theme-focus-ring-soft ylc-theme-text-secondary hover:text-[var(--ylc-text-primary)] disabled:opacity-35 disabled:cursor-not-allowed'
              onClick={handleRedo}
            >
              <TbArrowForwardUp size={20} />
            </button>
            <button
              type='button'
              data-ylc-setting-close-button
              aria-label={t('content.aria.close')}
              className='ylc-setting-close-button inline-flex items-center justify-center w-[40px] h-[40px] p-[8px] cursor-pointer rounded-md border-none bg-transparent transition-colors duration-160 ylc-theme-focus-ring-soft ylc-theme-text-secondary hover:text-[var(--ylc-text-primary)]'
              onClick={() => onOpenChange(false)}
            >
              <RiCloseLine size={24} />
            </button>
          </div>
        </header>
        <span key={historyAnnouncement.sequence} className='ylc-visually-hidden' role='status' aria-live='polite'>
          {historyAnnouncement.message}
        </span>
        <div
          id={`ylc-tabpanel-${menuItem}`}
          role='tabpanel'
          aria-labelledby={`ylc-tab-${menuItem}`}
          data-ylc-setting-scroll-container='true'
          className='flex-grow overflow-y-scroll h-[380px] p-2 rounded-2xl'
          style={{ overscrollBehavior: 'contain' }}
        >
          {menuItem === 'setting' && <SettingContent diagnostics={diagnostics} />}
          {menuItem === 'preset' && <PresetContent />}
        </div>
        <footer className='ylc-theme-setting-footer flex justify-end items-center px-2 py-1'>
          <div className='ylc-theme-footer-links'>
            <a
              href='https://github.com/daichan132/Youtube-Live-Chat-Fullscreen'
              target='_blank'
              rel='noopener noreferrer'
              className='ylc-theme-footer-link'
            >
              <TbBrandGithub size={15} aria-hidden='true' />
              GitHub
            </a>
            <a href='https://ko-fi.com/daichan132' target='_blank' rel='noopener noreferrer' className='ylc-theme-footer-link'>
              <TbHeart size={15} aria-hidden='true' />
              {t('content.setting.footer.donate')}
            </a>
          </div>
        </footer>
      </div>
    </Modal>
  )
}
