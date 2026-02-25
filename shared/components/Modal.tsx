import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onRequestClose?: () => void
  onAfterOpen?: () => void
  onAfterClose?: () => void
  shouldCloseOnOverlayClick?: boolean
  shouldFocusAfterRender?: boolean
  shouldReturnFocusAfterClose?: boolean
  parentSelector?: () => HTMLElement
  overlayStyle?: CSSProperties
  overlayClassName?: string
  contentStyle?: CSSProperties
  contentClassName?: string
  children: ReactNode
}

export const Modal = ({
  isOpen,
  onRequestClose,
  onAfterOpen,
  onAfterClose,
  shouldCloseOnOverlayClick = true,
  shouldFocusAfterRender = true,
  shouldReturnFocusAfterClose = true,
  parentSelector,
  overlayStyle,
  overlayClassName,
  contentStyle,
  contentClassName,
  children,
}: ModalProps) => {
  const previousFocusRef = useRef<Element | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (shouldReturnFocusAfterClose) {
        previousFocusRef.current = document.activeElement
      }
      onAfterOpen?.()
      if (shouldFocusAfterRender) {
        requestAnimationFrame(() => {
          contentRef.current?.focus({ preventScroll: true })
        })
      }
    } else if (!isOpen && wasOpenRef.current) {
      onAfterClose?.()
      if (shouldReturnFocusAfterClose && previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus({ preventScroll: true })
      }
      previousFocusRef.current = null
    }
    wasOpenRef.current = isOpen
  }, [isOpen, onAfterOpen, onAfterClose, shouldFocusAfterRender, shouldReturnFocusAfterClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onRequestClose?.()
      }
    },
    [onRequestClose],
  )

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (shouldCloseOnOverlayClick && e.target === e.currentTarget) {
        onRequestClose?.()
      }
    },
    [shouldCloseOnOverlayClick, onRequestClose],
  )

  if (!isOpen) return null

  const parent = parentSelector?.() ?? document.body

  return createPortal(
    <div
      role='dialog'
      aria-modal='true'
      className={overlayClassName}
      style={
        overlayClassName
          ? overlayStyle
          : {
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0)',
              zIndex: 1000000,
              ...overlayStyle,
            }
      }
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={contentRef}
        className={contentClassName}
        style={
          contentClassName
            ? contentStyle
            : {
                position: 'fixed',
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
                overflow: 'visible',
                ...contentStyle,
              }
        }
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    parent,
  )
}
