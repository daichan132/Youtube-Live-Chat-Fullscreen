import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'

type ModalAccessibleName = { ariaLabel: string; ariaLabelledBy?: never } | { ariaLabel?: never; ariaLabelledBy: string }

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
    element => !element.hasAttribute('hidden') && !element.hasAttribute('inert') && element.getAttribute('aria-hidden') !== 'true',
  )

const getSiblingElements = (parent: ParentNode, branch: Element) =>
  Array.from(parent.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== branch)

const getInertTargets = (overlay: HTMLElement) => {
  const targets: HTMLElement[] = []
  let branch: Element = overlay

  while (true) {
    const parentElement = branch.parentElement
    if (parentElement) {
      targets.push(...getSiblingElements(parentElement, branch))
      branch = parentElement
      continue
    }

    const root = branch.getRootNode()
    if (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) {
      targets.push(...getSiblingElements(root, branch))
      branch = root.host
      continue
    }

    return [...new Set(targets)]
  }
}

const makeBackgroundInert = (overlay: HTMLElement) => {
  const targets = getInertTargets(overlay)
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
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const focusFrameRef = useRef<number | null>(null)
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const closeRef = useRef(onRequestClose)
  closeRef.current = onRequestClose
  const lifecycleRef = useRef({ onAfterOpen, onAfterClose, shouldFocusAfterRender, shouldReturnFocusAfterClose })
  lifecycleRef.current = { onAfterOpen, onAfterClose, shouldFocusAfterRender, shouldReturnFocusAfterClose }

  useLayoutEffect(() => {
    if (!isOpen) {
      setParent(null)
      return
    }
    const nextParent = parentSelector?.() ?? document.body
    setParent(current => (current === nextParent ? current : nextParent))
  }, [isOpen, parentSelector])

  useLayoutEffect(() => {
    if (!isOpen || !parent) return

    const modalId = modalIdRef.current
    const previousFocus = lifecycleRef.current.shouldReturnFocusAfterClose ? getDeepActiveElement() : null
    modalStack.push(modalId)
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || modalStack[modalStack.length - 1] !== modalId) return
      event.preventDefault()
      event.stopPropagation()
      closeRef.current?.()
    }
    document.addEventListener('keydown', handleDocumentKeyDown, true)

    const overlay = overlayRef.current
    const restoreBackground = overlay ? makeBackgroundInert(overlay) : () => {}
    lifecycleRef.current.onAfterOpen?.()

    if (lifecycleRef.current.shouldFocusAfterRender) {
      focusFrameRef.current = requestAnimationFrame(() => {
        focusFrameRef.current = null
        contentRef.current?.focus({ preventScroll: true })
      })
    }

    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown, true)
      if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current)
      focusFrameRef.current = null
      restoreBackground()
      const index = modalStack.lastIndexOf(modalId)
      if (index >= 0) modalStack.splice(index, 1)
      lifecycleRef.current.onAfterClose?.()
      if (lifecycleRef.current.shouldReturnFocusAfterClose && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [isOpen, parent])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (modalStack[modalStack.length - 1] !== modalIdRef.current || event.key !== 'Tab') return

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
  }, [])

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (modalStack[modalStack.length - 1] !== modalIdRef.current) return
      if (shouldCloseOnOverlayClick && event.target === event.currentTarget) onRequestClose?.()
    },
    [onRequestClose, shouldCloseOnOverlayClick],
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
