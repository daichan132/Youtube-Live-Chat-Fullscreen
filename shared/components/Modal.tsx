import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'

type ModalAccessibleName =
  | { ariaLabel: string; ariaLabelledBy?: never }
  | { ariaLabel?: never; ariaLabelledBy: string }

type ModalProps = {
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
} & ModalAccessibleName

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

const modalStack: symbol[] = []

const getDeepActiveElement = () => {
  let activeElement: Element | null = document.activeElement
  while (activeElement?.shadowRoot?.activeElement) activeElement = activeElement.shadowRoot.activeElement
  return activeElement
}

const getFocusableElements = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
  )

const getInertTargets = (parent: HTMLElement, overlay: HTMLElement) => {
  const directSiblings = Array.from(parent.children).filter(
    (element): element is HTMLElement => element instanceof HTMLElement && element !== overlay,
  )
  if (directSiblings.length > 0) return directSiblings

  if (parent !== document.body && parent.parentElement) {
    return Array.from(parent.parentElement.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== parent,
    )
  }

  const root = parent.getRootNode()
  if (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) {
    return Array.from(root.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== parent)
  }

  return []
}

const makeBackgroundInert = (parent: HTMLElement, overlay: HTMLElement) => {
  const targets = getInertTargets(parent, overlay)
  const previous = targets.map(target => ({ target, inert: target.hasAttribute('inert') }))
  for (const target of targets) target.setAttribute('inert', '')
  return () => {
    for (const entry of previous) {
      if (!entry.inert) entry.target.removeAttribute('inert')
    }
  }
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
  ariaLabel,
  ariaLabelledBy,
  children,
}: ModalProps) => {
  const modalIdRef = useRef(Symbol('modal'))
  const previousFocusRef = useRef<Element | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const focusFrameRef = useRef<number | null>(null)
  const wasOpenRef = useRef(false)
  const parent = isOpen ? (parentSelector?.() ?? document.body) : null

  useEffect(() => {
    if (!isOpen || !parent) return
    const modalId = modalIdRef.current
    modalStack.push(modalId)
    const overlay = overlayRef.current
    const restoreBackground = overlay ? makeBackgroundInert(parent, overlay) : () => {}

    return () => {
      restoreBackground()
      const index = modalStack.lastIndexOf(modalId)
      if (index >= 0) modalStack.splice(index, 1)
    }
  }, [isOpen, parent])

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (shouldReturnFocusAfterClose) {
        previousFocusRef.current = getDeepActiveElement()
      }
      onAfterOpen?.()
      if (shouldFocusAfterRender) {
        focusFrameRef.current = requestAnimationFrame(() => {
          focusFrameRef.current = null
          contentRef.current?.focus({ preventScroll: true })
        })
      }
    } else if (!isOpen && wasOpenRef.current) {
      if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current)
      focusFrameRef.current = null
      onAfterClose?.()
      if (shouldReturnFocusAfterClose && previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus({ preventScroll: true })
      }
      previousFocusRef.current = null
    }
    wasOpenRef.current = isOpen
  }, [isOpen, onAfterOpen, onAfterClose, shouldFocusAfterRender, shouldReturnFocusAfterClose])

  useEffect(
    () => () => {
      if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current)
    },
    [],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== modalIdRef.current) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onRequestClose?.()
        return
      }
      if (event.key !== 'Tab') return

      const content = contentRef.current
      if (!content) return
      const focusableElements = getFocusableElements(content)
      if (focusableElements.length === 0) {
        event.preventDefault()
        content.focus({ preventScroll: true })
        return
      }

      const activeElement = getDeepActiveElement()
      const activeIndex = activeElement instanceof HTMLElement ? focusableElements.indexOf(activeElement) : -1
      const nextElement = event.shiftKey
        ? activeIndex <= 0
          ? focusableElements[focusableElements.length - 1]
          : null
        : activeIndex === -1 || activeIndex === focusableElements.length - 1
          ? focusableElements[0]
          : null
      if (!nextElement) return
      event.preventDefault()
      event.stopPropagation()
      nextElement.focus({ preventScroll: true })
    },
    [onRequestClose],
  )

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (shouldCloseOnOverlayClick && event.target === event.currentTarget) {
        onRequestClose?.()
      }
    },
    [shouldCloseOnOverlayClick, onRequestClose],
  )

  if (!isOpen || !parent) return null

  return createPortal(
    <div
      ref={overlayRef}
      role='dialog'
      aria-modal='true'
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={overlayClassName}
      style={
        overlayClassName
          ? overlayStyle
          : {
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0)',
              zIndex: CONTENT_UI_LAYER.modal,
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
