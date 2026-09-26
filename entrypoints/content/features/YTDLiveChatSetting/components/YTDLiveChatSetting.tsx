import { useAtomValue, useSetAtom } from 'jotai'
import {
  appearanceCapacityErrorAtom,
  customCssDraftAtom,
  customCssEditorUiAtom,
  customCssOperationAtom,
  customCssRecoveryAtom,
  hasUnappliedCustomCssAtom,
} from '@/shared/state/customCssAtoms'
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
  const hasUnappliedCss = useAtomValue(hasUnappliedCustomCssAtom)
  const cssOperation = useAtomValue(customCssOperationAtom)
  const cssRecovery = useAtomValue(customCssRecoveryAtom)
  const cssSaving = cssOperation !== null || cssRecovery.pending
  const capacityError = useAtomValue(appearanceCapacityErrorAtom)
  const resetCssDraft = useSetAtom(customCssDraftAtom)
  const resetCssEditor = useSetAtom(customCssEditorUiAtom)
  const [confirmClose, setConfirmClose] = useState(false)
  const closeCancelRef = useRef<HTMLButtonElement>(null)
  const closeFocusRef = useRef<HTMLElement | null>(null)
  const closeNow = () => {
    resetCssDraft(null)
    resetCssEditor(current => ({ ...current, name: '', registering: false, source: null }))
    setConfirmClose(false)
    closeFocusRef.current = null
    onOpenChange(false)
  }
  useEffect(() => {
    if (!open) {
      setConfirmClose(false)
      closeFocusRef.current = null
    } else if (confirmClose) closeCancelRef.current?.focus()
  }, [open, confirmClose])
  useEffect(() => {
    if (!open || (!hasUnappliedCss && !cssSaving)) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [open, hasUnappliedCss, cssSaving])
  const tablistRef = useRef<HTMLDivElement>(null)
  const [historyAnnouncement, setHistoryAnnouncement] = useState({ message: '', sequence: 0 })
  const canUndo = useAtomValue(canUndoAtom)
  const canRedo = useAtomValue(canRedoAtom)
  const { finishYLCStyleGesture, redoYLCStyle, undoYLCStyle } = useStyleHistoryCommands()

  const focusActiveTab = useCallback(() => {
    const activeTab = tablistRef.current?.querySelector<HTMLButtonElement>('[role="tab"][tabindex="0"]')
    activeTab?.focus({ preventScroll: true })
  }, [])

  const cancelClose = () => {
    setConfirmClose(false)
    const previousFocus = closeFocusRef.current
    closeFocusRef.current = null
    if (previousFocus?.isConnected && !previousFocus.closest('details:not([open]), [hidden], [inert]')) {
      previousFocus.focus()
    } else focusActiveTab()
  }
  const requestClose = () => {
    // Modal routes Escape here. Dismiss only the currently open confirmation,
    // even when the save finished while the user was deciding.
    if (confirmClose) {
      cancelClose()
    } else if (cssSaving || hasUnappliedCss) {
      const focused = document.activeElement
      closeFocusRef.current = focused instanceof HTMLElement && focused !== document.body ? focused : null
      setConfirmClose(true)
    } else closeNow()
  }

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

  const dialogLabel = tabs.find(tab => tab.key === menuItem)?.label ?? t('content.setting.header.setting')

  return (
    <Modal
      isOpen={open}
      ariaLabel={dialogLabel}
      shouldFocusAfterRender={false}
      shouldCloseOnOverlayClick={true}
      shouldReturnFocusAfterClose={false}
      onRequestClose={requestClose}
      onAfterOpen={focusActiveTab}
      parentSelector={getModalParentElement}
    >
      <div
        data-ylc-theme={resolvedThemeMode}
        dir={direction}
        className='ylc-setting-panel flex flex-col rounded-xl ylc-theme-surface ylc-theme-shadow-md overflow-hidden border border-solid ylc-theme-border'
        style={{ width: 'min(460px, calc(100vw - 24px))', maxHeight: 'calc(100dvh - 24px)' }}
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
              onClick={requestClose}
            >
              <RiCloseLine size={24} />
            </button>
          </div>
        </header>
        <PersistenceNotice />
        {capacityError && <p role='alert' className='m-2 text-sm'>{t('content.customCss.appearanceFull')}</p>}
        {confirmClose && (
          <div className='ylc-css-close-confirm' role='group' aria-label={t('content.customCss.confirmTitle')}>
            <p>{t(cssSaving ? 'content.customCss.closeWhileSaving' : 'content.customCss.discardOnClose')}</p>
            <div className='flex flex-wrap gap-2'>
              <button ref={closeCancelRef} type='button' className='ylc-btn' onClick={cancelClose}>{t('content.customCss.keepEditing')}</button>
              <button type='button' className='ylc-btn' onClick={closeNow}>
                {t(cssSaving ? 'content.customCss.closeAnyway' : 'content.customCss.discardAndClose')}
              </button>
            </div>
          </div>
        )}
        <span key={historyAnnouncement.sequence} className='ylc-visually-hidden' role='status' aria-live='polite'>
          {historyAnnouncement.message}
        </span>
        <div
          id={`ylc-tabpanel-${menuItem}`}
          role='tabpanel'
          aria-labelledby={`ylc-tab-${menuItem}`}
          data-ylc-setting-scroll-container='true'
          className='min-h-0 flex-grow overflow-y-auto h-[380px] p-2 rounded-2xl'
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
