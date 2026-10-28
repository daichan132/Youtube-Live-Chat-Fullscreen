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
import { PersistenceNotice } from '@/shared/components/PersistenceNotice'
import { useLocaleDirection, useT } from '@/shared/i18n/react'
import { canRedoAtom, canUndoAtom, themeModeAtom } from '@/shared/state'
import { useResolvedThemeMode } from '@/shared/theme'
import { cn } from '@/shared/utils/cn'
import { isTextInputType } from '@/shared/utils/isTextInputType'
import { useStyleHistoryCommands } from '../styleHistoryCommands'
import { getModalParentElement } from '../utils/getModalParentElement'
import { PresetContent } from './PresetContent'
import { SettingContent } from './SettingContent'

type YTDLiveChatSettingProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingTab = 'setting' | 'preset'

export const YTDLiveChatSetting = ({ open, onOpenChange }: YTDLiveChatSettingProps) => {
  const themeMode = useAtomValue(themeModeAtom)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)
  const [menuItem, setMenuItem] = useState<SettingTab>('setting')
  const t = useT()
  const direction = useLocaleDirection()
  const panelRef = useRef<HTMLDivElement>(null)
  const tablistRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const scrollPositionsRef = useRef<Record<SettingTab, number>>({ setting: 0, preset: 0 })
  const [historyAnnouncement, setHistoryAnnouncement] = useState({ message: '', sequence: 0 })
  const canUndo = useAtomValue(canUndoAtom)
  const canRedo = useAtomValue(canRedoAtom)
  const { finishYLCStyleGesture, redoYLCStyle, undoYLCStyle } = useStyleHistoryCommands()

  const focusPanel = useCallback(() => {
    panelRef.current?.focus({ preventScroll: true })
  }, [])

  const handleClose = useCallback(() => {
    finishYLCStyleGesture()
    onOpenChange(false)
  }, [finishYLCStyleGesture, onOpenChange])

  const tabs = useMemo<{ key: SettingTab; label: string; icon: IconType }[]>(
    () => [
      { key: 'setting', label: t('content.setting.header.setting'), icon: TbSettings2 },
      { key: 'preset', label: t('content.setting.header.preset'), icon: TbLayoutGrid },
    ],
    [t],
  )

  const selectTab = useCallback(
    (nextTab: SettingTab) => {
      if (nextTab === menuItem) return
      const container = scrollContainerRef.current
      if (container) scrollPositionsRef.current[menuItem] = container.scrollTop
      setMenuItem(nextTab)
    },
    [menuItem],
  )

  const attachScrollContainer = useCallback(
    (container: HTMLDivElement | null) => {
      scrollContainerRef.current = container
      if (container) container.scrollTop = scrollPositionsRef.current[menuItem]
    },
    [menuItem],
  )

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.nativeEvent.isComposing) return
      const currentIndex = tabs.findIndex(tab => tab.key === menuItem)
      const forwardStep = direction === 'rtl' ? -1 : 1
      let nextIndex: number | null = null
      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + forwardStep + tabs.length) % tabs.length
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - forwardStep + tabs.length) % tabs.length
      } else if (e.key === 'Home') {
        nextIndex = 0
      } else if (e.key === 'End') {
        nextIndex = tabs.length - 1
      }
      if (nextIndex !== null) {
        const nextTab = tabs[nextIndex]
        if (!nextTab) return
        e.preventDefault()
        selectTab(nextTab.key)
        const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        buttons?.[nextIndex]?.focus()
      }
    },
    [direction, menuItem, selectTab, tabs],
  )

  useEffect(() => {
    if (!open) return

    const modalParent = getModalParentElement()
    modalParent.setAttribute('data-ylc-theme', resolvedThemeMode)
  }, [open, resolvedThemeMode])

  useEffect(() => {
    if (!open) {
      finishYLCStyleGesture()
      return
    }
    const handleWindowBlur = () => finishYLCStyleGesture()
    window.addEventListener('blur', handleWindowBlur)
    return () => window.removeEventListener('blur', handleWindowBlur)
  }, [finishYLCStyleGesture, open])

  const handleUndo = useCallback(() => {
    const handled = undoYLCStyle()
    if (handled) {
      setHistoryAnnouncement(current => ({
        message: t('content.setting.header.undone'),
        sequence: current.sequence + 1,
      }))
    }
    return handled
  }, [t])

  const handleRedo = useCallback(() => {
    const handled = redoYLCStyle()
    if (handled) {
      setHistoryAnnouncement(current => ({
        message: t('content.setting.header.redone'),
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
        return isTextInputType(target.type)
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

  const dialogLabel = tabs.find(tab => tab.key === menuItem)?.label ?? t('content.setting.header.setting')

  return (
    <Modal
      isOpen={open}
      ariaLabel={dialogLabel}
      shouldFocusAfterRender={false}
      shouldCloseOnOverlayClick={true}
      shouldReturnFocusAfterClose={false}
      onRequestClose={handleClose}
      onAfterOpen={focusPanel}
      parentSelector={getModalParentElement}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{ outline: 'none', width: 'min(460px, calc(100vw - 24px))', maxHeight: 'calc(100dvh - 24px)', boxSizing: 'border-box' }}
        data-ylc-theme={resolvedThemeMode}
        dir={direction}
        className='ylc-setting-panel flex min-h-0 flex-col rounded-xl ylc-theme-surface ylc-theme-shadow-md overflow-hidden border border-solid ylc-theme-border'
        onWheel={e => e.stopPropagation()}
        onKeyDownCapture={handlePanelKeyDown}
      >
        <header className='ylc-theme-setting-header shrink-0 justify-between items-stretch min-h-[48px]'>
          <div ref={tablistRef} className='ylc-theme-tablist min-w-0' role='tablist'>
            {tabs.map(item => (
              <button
                key={item.key}
                id={`ylc-tab-${item.key}`}
                type='button'
                role='tab'
                aria-selected={menuItem === item.key}
                aria-controls={`ylc-tabpanel-${item.key}`}
                tabIndex={menuItem === item.key ? 0 : -1}
                className={cn('ylc-theme-tab min-w-0 ylc-theme-focus-ring-soft', menuItem === item.key && 'ylc-theme-tab-active')}
                onClick={() => selectTab(item.key)}
                onKeyDown={handleTabKeyDown}
              >
                <item.icon size={16} className='shrink-0' />
                <span className='ylc-setting-tab-label'>{item.label}</span>
              </button>
            ))}
          </div>
          <div className='ylc-setting-header-actions self-center inline-flex shrink-0 items-center gap-0.5'>
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
              onClick={handleClose}
            >
              <RiCloseLine size={24} />
            </button>
          </div>
        </header>
        <PersistenceNotice />
        <span key={historyAnnouncement.sequence} className='ylc-visually-hidden' role='status' aria-live='polite'>
          {historyAnnouncement.message}
        </span>
        <div
          ref={attachScrollContainer}
          id={`ylc-tabpanel-${menuItem}`}
          role='tabpanel'
          // Firefox otherwise adds this scroll container to Tab order before its controls.
          tabIndex={-1}
          aria-labelledby={`ylc-tab-${menuItem}`}
          data-ylc-setting-scroll-container='true'
          className='min-h-0 flex-auto overflow-y-auto h-[380px] p-2 rounded-2xl'
          style={{ overscrollBehavior: 'contain' }}
          onScroll={event => {
            scrollPositionsRef.current[menuItem] = event.currentTarget.scrollTop
          }}
        >
          {menuItem === 'setting' && <SettingContent />}
          {menuItem === 'preset' && <PresetContent />}
        </div>
        <footer className='ylc-theme-setting-footer flex shrink-0 justify-end items-center px-2 py-1'>
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
